import { z } from "zod";
import { normalizeComparable, normalizeQualification } from "../matching/normalize.ts";
import type { JobMatch, UserProfile } from "../types.ts";

const explanationTextSchema = z.string().trim().min(1).max(700);

const similarRoleSchema = z.object({
  role: z.string().trim().min(1).max(100),
  reason: explanationTextSchema,
}).strict();

export const matchExplanationSchema = z.object({
  jobId: z.string().min(1).max(200),
  summary: z.string().trim().min(1).max(600),
  recommendationReasons: z.array(explanationTextSchema).min(1).max(3),
  profileConnections: z.array(explanationTextSchema).max(3),
  missingConditions: z.array(explanationTextSchema).max(3),
  improvementSuggestions: z.array(explanationTextSchema).max(3),
  unexpectedConnections: z.array(explanationTextSchema).max(2),
  similarRoles: z.array(similarRoleSchema).max(3),
}).strict();

export const explanationsSchema = z.object({
  explanations: z.array(matchExplanationSchema).max(20),
}).strict();

export type MatchExplanation = z.infer<typeof matchExplanationSchema>;
export type Explanations = z.infer<typeof explanationsSchema>;

export function assertExactExplanationJobIds(
  result: Explanations,
  expectedJobIds: readonly string[],
): void {
  const actualJobIds = result.explanations.map((explanation) => explanation.jobId);
  const actualJobIdSet = new Set(actualJobIds);

  if (actualJobIdSet.size !== actualJobIds.length) {
    throw new Error("OpenAI returned duplicate job IDs");
  }

  const expectedJobIdSet = new Set(expectedJobIds);
  if (actualJobIds.some((jobId) => !expectedJobIdSet.has(jobId))) {
    throw new Error("OpenAI returned an unknown job ID");
  }

  if (
    actualJobIds.length !== expectedJobIds.length
    || expectedJobIds.some((jobId) => !actualJobIdSet.has(jobId))
  ) {
    throw new Error("OpenAI omitted a job ID");
  }
}

export function assertKnownSimilarRoles(
  result: Explanations,
  allowedRoles: readonly string[],
): void {
  const allowedRoleSet = new Set(allowedRoles);
  if (result.explanations.some((item) =>
    item.similarRoles.some(({ role }) => !allowedRoleSet.has(role)))) {
    throw new Error("OpenAI returned an unknown similar role");
  }
}

// 대괄호는 공고 제목 표기([경력], [Tech] 등)를 인용할 때 정상적으로 쓰이므로 차단하지 않는다
const FORBIDDEN_USER_FACING_PATTERN = /matchedSkills|missingSkills|matchedEvidence|missingEvidence|skills|certificates|profile|jobId|discoveredRole|recommendationReasons|missingConditions|JSON|필드|배열|객체|입력값|[{}]/i;

function explanationTexts(result: Explanations): string[] {
  return result.explanations.flatMap((item) => [
    item.summary,
    ...item.recommendationReasons,
    ...item.profileConnections,
    ...item.missingConditions,
    ...item.improvementSuggestions,
    ...item.unexpectedConnections,
    ...item.similarRoles.flatMap(({ role, reason }) => [role, reason]),
  ]);
}

export function assertNoDeveloperLanguage(result: Explanations): void {
  if (explanationTexts(result).some((text) => FORBIDDEN_USER_FACING_PATTERN.test(text))) {
    throw new Error("OpenAI returned developer-facing language");
  }
}

export function assertGroundedExplanations(
  result: Explanations,
  matches: readonly JobMatch[],
  profile: UserProfile,
): void {
  const matchById = new Map(matches.map((match) => [match.job.id, match]));
  const ownedQualifications = profile.certificates
    .map(normalizeQualification)
    .filter((item) => item !== null);

  for (const explanation of result.explanations) {
    const match = matchById.get(explanation.jobId);
    if (!match) throw new Error("Cannot validate explanation for unknown job");
    const texts = [
      explanation.summary,
      ...explanation.recommendationReasons,
      ...explanation.profileConnections,
      ...explanation.missingConditions,
      ...explanation.improvementSuggestions,
      ...explanation.unexpectedConnections,
      ...explanation.similarRoles.map(({ reason }) => reason),
    ];
    // 긍정적 지역 일치 주장만 차단 — "일치하지 않지만" 같은 정직한 부정 언급은 허용
    const claimsLocationMatch = (text: string) => {
      const claimPattern = /(?:희망\s*)?근무?지역.{0,20}(?:일치|같|부합)[^.。!?]{0,12}/g;
      for (const claim of text.match(claimPattern) ?? []) {
        if (!/않|아니|없|어렵|다르/.test(claim)) return true;
      }
      return false;
    };
    if (!match.locationMatch && texts.some(claimsLocationMatch)) {
      throw new Error("OpenAI falsely claimed a location match");
    }
    for (const text of texts) {
      const compact = normalizeComparable(text);
      for (const base of ["컴퓨터활용능력", "한국사능력검정시험"] as const) {
        for (const grade of ["1급", "2급"] as const) {
          if (compact.includes(normalizeComparable(`${base}${grade}`)) && /보유|취득|충족/.test(text)) {
            const isOwned = ownedQualifications.some((item) => item.base === base && item.grade === grade);
            if (!isOwned) throw new Error("OpenAI claimed an unowned qualification grade");
          }
        }
      }
    }
  }
}
