import type { Job, JobMatch, SkillGap, SkillMatch, SubScore, UserProfile } from "@/lib/types";
import { getSemanticScores } from "@/lib/matching/semanticScore";

const SUBSCORE_WEIGHTS = {
  major: 0.25,
  experience: 0.3,
  skill: 0.3,
  condition: 0.15,
};

// semanticScore(임베딩 유사도)가 있으면 경험 적합도에 이 비중만큼 반영, 없으면 키워드 매칭만 사용
const SEMANTIC_BLEND_WEIGHT = 0.5;

interface ExperienceSource {
  label: string;
  texts: string[];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s._-]/g, "");
}

function includesTerm(values: string[], target: string) {
  const needle = normalize(target);
  if (!needle) return false;
  return values.some((value) => {
    const haystack = normalize(value);
    return haystack.length > 0 && (haystack.includes(needle) || needle.includes(haystack));
  });
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function ratioScore(matched: number, total: number) {
  return total ? (matched / total) * 100 : 100;
}

function buildExperienceSources(profile: UserProfile): ExperienceSource[] {
  return [
    { label: "경력", texts: profile.careerExperiences },
    { label: "경험", texts: profile.projectExperiences },
  ].filter((source) => source.texts.length > 0);
}

function findSourceContext(sources: ExperienceSource[], skill: string): string | null {
  const matchedSource = sources.find((source) => includesTerm(source.texts, skill));
  return matchedSource ? matchedSource.label : null;
}

function scoreMajorFit(profile: UserProfile, job: Job): number {
  const majorMatched = job.relatedMajors.some((major) => includesTerm([profile.major], major));
  return majorMatched ? 92 : 45;
}

// 기술 적합도: 필수 스킬 비중을 크게, 우대 스킬은 보너스로 반영
function scoreSkillFit(profile: UserProfile, job: Job): number {
  const techTerms = [...profile.skills, ...profile.certificates];
  const matchedRequired = job.requiredSkills.filter((skill) => includesTerm(techTerms, skill));
  const matchedPreferred = job.preferredSkills.filter((skill) => includesTerm(techTerms, skill));
  return clampScore(
    ratioScore(matchedRequired.length, job.requiredSkills.length) * 0.8 +
      ratioScore(matchedPreferred.length, job.preferredSkills.length) * 0.2,
  );
}

// 경험 적합도: 키워드 매칭에 (가능하면) 임베딩 의미 유사도를 블렌딩해 표현이 달라도
// 의미가 통하는 경험(예: "센서 제어" ↔ "자동화 설비 제어")을 보완한다.
function scoreExperienceFit(sources: ExperienceSource[], job: Job, semanticScore?: number): number {
  const experienceTexts = sources.flatMap((source) => source.texts);
  if (experienceTexts.length === 0) return 30;

  const requiredHit = job.requiredSkills.filter((skill) => includesTerm(experienceTexts, skill));
  const preferredHit = job.preferredSkills.filter((skill) => includesTerm(experienceTexts, skill));
  const roleHit = includesTerm(experienceTexts, job.discoveredRole) || includesTerm(experienceTexts, job.title);
  const keywordScore = clampScore(35 + requiredHit.length * 16 + preferredHit.length * 8 + (roleHit ? 10 : 0));

  if (semanticScore === undefined) return keywordScore;
  return clampScore(keywordScore * (1 - SEMANTIC_BLEND_WEIGHT) + semanticScore * SEMANTIC_BLEND_WEIGHT);
}

function scoreConditionFit(profile: UserProfile, job: Job): number {
  const locationMatched =
    normalize(job.location).includes(normalize(profile.preferredLocation)) ||
    normalize(profile.preferredLocation).includes(normalize(job.location));
  const typeMatched =
    profile.preferredConditions.trim() === "" || includesTerm([profile.preferredConditions], job.employmentType);

  let score = 50;
  if (locationMatched) score += 35;
  if (typeMatched) score += 15;
  return clampScore(score);
}

function buildStrengths(profile: UserProfile, job: Job, sources: ExperienceSource[]): SkillMatch[] {
  const techTerms = [...profile.skills, ...profile.certificates];
  const candidateSkills = [...new Set([...job.requiredSkills, ...job.preferredSkills])];
  const relatedTo = `${job.discoveredRole} 업무`;

  const strengths: SkillMatch[] = [];

  const majorMatched = job.relatedMajors.some((major) => includesTerm([profile.major], major));
  if (majorMatched) {
    strengths.push({ label: `${profile.major} 전공`, sourceContext: "전공", relatedTo: `${job.discoveredRole} 업무 기반` });
  }

  for (const skill of candidateSkills) {
    const experienceContext = findSourceContext(sources, skill);
    if (experienceContext) {
      strengths.push({ label: skill, sourceContext: experienceContext, relatedTo });
      continue;
    }
    if (includesTerm(techTerms, skill)) {
      strengths.push({ label: skill, sourceContext: "보유 기술·자격증", relatedTo });
    }
  }

  return strengths;
}

function buildGaps(profile: UserProfile, job: Job, sources: ExperienceSource[]): SkillGap[] {
  const techTerms = [...profile.skills, ...profile.certificates, ...sources.flatMap((source) => source.texts)];
  const missing = job.requiredSkills.filter((skill) => !includesTerm(techTerms, skill));

  return missing.slice(0, 2).map((skill) => ({
    label: skill,
    suggestion: `${skill} 관련 역량 보완 교육 과정을 통해 채울 수 있어요.`,
  }));
}

function buildReasonSummary(strengths: SkillMatch[], profile: UserProfile, job: Job): string {
  const topLabels = strengths.slice(0, 2).map((strength) => strength.label);
  if (topLabels.length === 0) {
    return `${profile.major} 전공과 보유 역량을 확장해 볼 수 있는 직무입니다.`;
  }
  return `${topLabels.join(", ")} 역량이 ${job.discoveredRole} 업무와 높은 연관성을 보입니다.`;
}

function overallScore(subScores: SubScore[]) {
  return subScores.reduce((sum, item) => sum + item.score * item.weight, 0);
}

export function calculateMatch(profile: UserProfile, job: Job, semanticScore?: number): JobMatch {
  const sources = buildExperienceSources(profile);

  const subScores: SubScore[] = [
    { label: "전공 적합도", score: scoreMajorFit(profile, job), weight: SUBSCORE_WEIGHTS.major },
    { label: "경험 적합도", score: scoreExperienceFit(sources, job, semanticScore), weight: SUBSCORE_WEIGHTS.experience },
    { label: "기술 적합도", score: scoreSkillFit(profile, job), weight: SUBSCORE_WEIGHTS.skill },
    { label: "근무조건 적합도", score: scoreConditionFit(profile, job), weight: SUBSCORE_WEIGHTS.condition },
  ];

  const strengths = buildStrengths(profile, job, sources);
  const gaps = buildGaps(profile, job, sources);
  const matchedSkills = [...new Set(strengths.map((strength) => strength.label))];
  const missingSkills = gaps.map((gap) => gap.label);
  const reasonSummary = buildReasonSummary(strengths, profile, job);

  const usualKeywords = profile.usualSearchKeywords;
  const jobIsUsualKeyword = usualKeywords.some((keyword) => includesTerm([job.title, job.discoveredRole], keyword));
  const isHiddenGem = usualKeywords.length > 0 && !jobIsUsualKeyword && strengths.length > 0;
  const hiddenGemNote = isHiddenGem
    ? `평소 검색하던 '${usualKeywords.join(", ")}'와(과) 직무명은 다르지만, 이 공고의 실제 업무(${job.discoveredRole})에 회원님의 경험이 연결됩니다.`
    : undefined;

  return { job, subScores, matchedSkills, missingSkills, reasonSummary, strengths, gaps, isHiddenGem, hiddenGemNote };
}

export async function rankJobs(profile: UserProfile, jobs: Job[]) {
  // 팀원이 추가한 임베딩 기반 의미 유사도 — 실패하거나 API 키가 없으면 null로
  // 폴백되어 키워드 매칭만으로 계산된다.
  const semanticScores = await getSemanticScores(profile, jobs);
  return jobs
    .map((job) => calculateMatch(profile, job, semanticScores?.get(job.id)))
    .sort((a, b) => overallScore(b.subScores) - overallScore(a.subScores));
}
