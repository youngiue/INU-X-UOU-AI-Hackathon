import type { Job, JobMatch, UserProfile } from "@/lib/types";

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

export function calculateMatch(profile: UserProfile, job: Job): JobMatch {
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
  const majorMatched = job.relatedMajors.some((major) => includesTerm([profile.major], major));
  const experienceTerms = [...job.requiredSkills, ...job.preferredSkills].filter((skill) =>
    includesTerm(allExperiences, skill),
  );
  const locationMatched = normalize(job.location).includes(normalize(profile.preferredLocation));

  const requiredScore = job.requiredSkills.length ? (matchedRequired.length / job.requiredSkills.length) * 45 : 45;
  const experienceScore = Math.min(25, experienceTerms.length * 8 + (matchedRequired.length ? 5 : 0));
  const majorScore = majorMatched ? 10 : 0;
  const preferredScore = job.preferredSkills.length ? (matchedPreferred.length / job.preferredSkills.length) * 10 : 10;
  const locationScore = locationMatched ? 10 : 0;
  const score = Math.round(requiredScore + experienceScore + majorScore + preferredScore + locationScore);
  const matchedSkills = [...new Set([...matchedRequired, ...matchedPreferred])];
  const missingSkills = job.requiredSkills.filter((skill) => !matchedRequired.includes(skill));

  const reasons = [
    matchedSkills.length
      ? `${matchedSkills.join(", ")} 역량이 공고의 실제 업무와 연결됩니다.`
      : `${profile.major} 전공과 경험을 확장해 볼 수 있는 직무입니다.`,
    majorMatched
      ? `${profile.major} 전공이 ${job.discoveredRole} 업무 기반과 관련됩니다.`
      : `기존 검색어와 다른 ${job.discoveredRole} 분야로 탐색 범위를 넓힐 수 있습니다.`,
  ];

  return { job, score: Math.min(score, 100), matchedSkills, missingSkills, reasons };
}

export function rankJobs(profile: UserProfile, jobs: Job[]) {
  return jobs
    .map((job) => calculateMatch(profile, job))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
