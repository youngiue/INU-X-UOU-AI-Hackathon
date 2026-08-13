import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { EXPLAIN_MATCH_SYSTEM_PROMPT } from "@/lib/openai/prompts/explain-match";
import { explanationsSchema, type Explanations } from "@/lib/schemas/explanation";
import type { JobMatch, UserProfile } from "@/lib/types";
import { normalizeQualification } from "@/lib/matching/normalize";

function buildExplanationEvidence(match: JobMatch) {
  const matchedEvidence = match.matchedEvidence?.length
    ? match.matchedEvidence
    : match.strengths.map((strength, index) => ({
        id: `evidence-${index + 1}`,
        category: strength.sourceContext.includes("전공") ? "major" as const
          : normalizeQualification(strength.label) ? "certificate" as const
            : strength.sourceContext.includes("경험") ? "career" as const : "skill" as const,
        profileValue: strength.label,
        jobValue: strength.relatedTo,
        explanationBasis: strength.sourceContext,
      }));
  const missingEvidence = match.missingEvidence?.length
    ? match.missingEvidence
    : match.gaps.map((gap, index) => ({
        id: `missing-${index + 1}`,
        category: normalizeQualification(gap.label) ? "certificate" as const : "skill" as const,
        profileValue: "",
        jobValue: gap.label,
        explanationBasis: gap.suggestion ?? "현재 등록된 프로필에서 확인되지 않는 공고 요구사항",
      }));
  const locationMatch = match.locationMatch ?? [
    "EXACT_LOCAL_MATCH", "MULTI_WORKSITE_MATCH", "MULTI_SIGUNGU_MATCH", "ULSAN_BROAD_MATCH",
  ].includes(match.location_match?.level ?? "");
  return { matchedEvidence, missingEvidence, locationMatch };
}

export async function enhanceReasons(profile: UserProfile, matches: JobMatch[]): Promise<Explanations | null> {
  if (!process.env.OPENAI_API_KEY || matches.length === 0) return null;
  const allowedSimilarRoles = matches.flatMap((item) => [item.job.title, item.job.discoveredRole]);
  const aiInput = {
    사용자프로필: {
      전공: profile.major, 학력: profile.education, 경력: profile.careerExperiences,
      인턴경험: profile.internshipExperiences, 프로젝트경험: profile.projectExperiences,
      보유자격증: profile.certificates, 보유기술: profile.skills,
      교육경험: profile.trainingExperiences, 기타경험: profile.experience,
      희망근무조건: profile.preferredConditions, 관심산업: profile.interestedIndustries,
      희망근무지역: profile.preferredLocation,
    },
    추천결과: matches.map((match) => {
      const evidence = buildExplanationEvidence(match);
      return ({
      식별자: match.job.id, 회사: match.job.company, 직무명: match.job.title,
      연결직무: match.job.discoveredRole, 근무지역: match.job.location,
      공고업무: match.job.description, 필수요구사항: match.job.requiredSkills,
      우대요구사항: match.job.preferredSkills, 관련전공: match.job.relatedMajors,
      일치근거: evidence.matchedEvidence, 부족및확인필요근거: evidence.missingEvidence,
      지역일치: evidence.locationMatch, 지역판정근거: match.location_match?.reason ?? "",
      일치자격증: match.matchedQualifications ?? [],
      부족자격증: match.missingQualifications ?? [], 확인필요자격증: match.uncertainQualifications ?? [],
      허용유사직무명: allowedSimilarRoles,
    }); }),
  };
  const response = await getOpenAIClient().responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
    store: false,
    input: [
      { role: "system", content: EXPLAIN_MATCH_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(aiInput) },
    ],
    text: { format: zodTextFormat(explanationsSchema, "job_explanations") },
  });
  if (!response.output_parsed) throw new Error("OpenAI returned no parsed explanations");
  return response.output_parsed;
}
