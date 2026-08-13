import type { Job, JobMatch, UserProfile } from "@/lib/types";
import { getSemanticScores } from "@/lib/matching/semanticScore";

// fitScore = 기술*skill + 경험*experience + 전공*major + 조건*condition
const FIT_WEIGHTS = {
  skill: 0.4,
  experience: 0.3,
  major: 0.15,
  condition: 0.15,
};

// discoveryScore = 평소 검색 직무와의 이질성(novelty) + 실제 업무 적합도(experience)
const DISCOVERY_WEIGHTS = {
  novelty: 0.6,
  experience: 0.4,
};

// finalScore = fitScore*fit + discoveryScore*discovery
const FINAL_WEIGHTS = {
  fit: 0.7,
  discovery: 0.3,
};

// semanticScore(임베딩 유사도)가 있으면 경험 적합도에 이 비중만큼 반영, 없으면 키워드 매칭만 사용
const SEMANTIC_BLEND_WEIGHT = 0.5;

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s._-]/g, "");
}

function includesTerm(values: string[], target: string) {
  const needle = normalize(target);
  return values.some((value) => {
    const haystack = normalize(value);
    return haystack.includes(needle) || needle.includes(haystack);
  });
}

function ratioScore(matched: number, total: number) {
  return total ? (matched / total) * 100 : 100;
}

export function calculateMatch(profile: UserProfile, job: Job, semanticScore?: number): JobMatch {
  const allExperiences = [
    ...profile.careerExperiences,
    ...profile.internshipExperiences,
    ...profile.projectExperiences,
    ...profile.trainingExperiences,
    profile.experience,
  ];
  const profileTerms = [
    ...profile.skills,
    ...profile.certificates,
    ...profile.interestedIndustries,
    ...allExperiences,
    profile.major,
    profile.education,
  ];

  const matchedRequired = job.requiredSkills.filter((skill) => includesTerm(profileTerms, skill));
  const matchedPreferred = job.preferredSkills.filter((skill) => includesTerm(profileTerms, skill));
  const matchedSkills = [...new Set([...matchedRequired, ...matchedPreferred])];
  const missingSkills = job.requiredSkills.filter((skill) => !matchedRequired.includes(skill));

  // 기술 적합도: 필수 스킬 비중을 크게, 우대 스킬은 보너스로
  const skillScore =
    ratioScore(matchedRequired.length, job.requiredSkills.length) * 0.8 +
    ratioScore(matchedPreferred.length, job.preferredSkills.length) * 0.2;

  // 경험·실제 업무 적합도: 공고가 요구하는 스킬이 사용자 경험 텍스트에 실제로 등장하는 비율
  const jobDutySkills = [...job.requiredSkills, ...job.preferredSkills];
  const experienceTerms = jobDutySkills.filter((skill) => includesTerm(allExperiences, skill));
  const keywordExperienceScore = Math.min(
    100,
    ratioScore(experienceTerms.length, jobDutySkills.length) + (matchedRequired.length ? 15 : 0),
  );
  // 표현은 달라도 의미가 통하는 경험(예: "센서 제어" ↔ "자동화 설비 제어")은 임베딩 유사도로 보완
  const experienceScore =
    semanticScore === undefined
      ? keywordExperienceScore
      : Math.round(
          keywordExperienceScore * (1 - SEMANTIC_BLEND_WEIGHT) + semanticScore * SEMANTIC_BLEND_WEIGHT,
        );

  // 전공 적합도
  const majorMatched = job.relatedMajors.some((major) => includesTerm([profile.major], major));
  const majorScore = majorMatched ? 100 : 0;

  // 근무조건 적합도: 지역 일치 + 희망조건 텍스트와 공고 내용의 겹침
  const locationMatched = normalize(job.location).includes(normalize(profile.preferredLocation));
  const conditionWords = profile.preferredConditions
    .split(/[,\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const matchedConditionWords = conditionWords.filter((word) =>
    includesTerm([job.description, job.location], word),
  );
  const conditionTextScore = conditionWords.length
    ? ratioScore(matchedConditionWords.length, conditionWords.length)
    : 100;
  const conditionScore = Math.round((locationMatched ? 100 : 0) * 0.6 + conditionTextScore * 0.4);

  const fitScore = Math.round(
    skillScore * FIT_WEIGHTS.skill +
      experienceScore * FIT_WEIGHTS.experience +
      majorScore * FIT_WEIGHTS.major +
      conditionScore * FIT_WEIGHTS.condition,
  );

  // 발견도: 평소 검색하던 직무와 다른 직무일수록, 실제 업무 적합도가 높을수록 상승
  const isUsualRole = profile.usualSearchRoles.some((role) =>
    includesTerm([job.discoveredRole, job.title], role),
  );
  const noveltyScore = profile.usualSearchRoles.length ? (isUsualRole ? 20 : 100) : 50;
  const discoveryScore = Math.round(
    noveltyScore * DISCOVERY_WEIGHTS.novelty + experienceScore * DISCOVERY_WEIGHTS.experience,
  );

  const finalScore = Math.min(
    100,
    Math.round(fitScore * FINAL_WEIGHTS.fit + discoveryScore * FINAL_WEIGHTS.discovery),
  );

  const reasons = [
    matchedSkills.length
      ? `${matchedSkills.join(", ")} 역량이 공고의 실제 업무와 연결됩니다.`
      : `${profile.major} 전공과 경험을 확장해 볼 수 있는 직무입니다.`,
    !isUsualRole && profile.usualSearchRoles.length
      ? `평소 검색하던 ${profile.usualSearchRoles.join(", ")}와 다른 ${job.discoveredRole} 분야지만 실제 업무 기반으로 연결됩니다.`
      : majorMatched
        ? `${profile.major} 전공이 ${job.discoveredRole} 업무 기반과 관련됩니다.`
        : `기존 검색어와 다른 ${job.discoveredRole} 분야로 탐색 범위를 넓힐 수 있습니다.`,
  ];

  return {
    job,
    score: finalScore,
    fitScore: Math.min(fitScore, 100),
    discoveryScore: Math.min(discoveryScore, 100),
    finalScore,
    scoreBreakdown: {
      skill: Math.round(skillScore),
      experience: Math.round(experienceScore),
      major: majorScore,
      condition: conditionScore,
    },
    matchedSkills,
    missingSkills,
    reasons,
  };
}

export async function rankJobs(profile: UserProfile, jobs: Job[]) {
  const semanticScores = await getSemanticScores(profile, jobs);
  return jobs
    .map((job) => calculateMatch(profile, job, semanticScores?.get(job.id)))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 3);
}
