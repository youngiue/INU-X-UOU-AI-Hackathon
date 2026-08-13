import type { Job, JobMatch, UserProfile } from "../types";

const MINIMUM_SCORE = 24;
const DISTRICTS = ["중구", "남구", "동구", "북구", "울주군"] as const;
type District = (typeof DISTRICTS)[number];

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s._\-·/]/g, "");
}

function profileTerms(profile: UserProfile) {
  return [
    profile.major,
    profile.education,
    profile.experience,
    profile.preferredConditions,
    ...profile.skills,
    ...profile.certificates,
    ...profile.interestedIndustries,
    ...profile.careerExperiences,
    ...profile.internshipExperiences,
    ...profile.projectExperiences,
    ...profile.trainingExperiences,
  ].filter(Boolean);
}

function hasTerm(values: string[], target: string) {
  const needle = normalize(target);
  return Boolean(needle) && values.some((value) => {
    const haystack = normalize(value);
    return haystack.includes(needle) || needle.includes(haystack);
  });
}

function hasAnyTerm(values: string[], targets: string[]) {
  return targets.some((target) => hasTerm(values, target));
}

const GENERIC_EXPERIENCE_TOKENS = new Set(["프로젝트", "운영", "기획", "활동", "경험", "작성", "관리", "지원"]);

function matchesExperienceExample(values: string[], example: string) {
  if (hasTerm(values, example)) return true;
  const tokens = (example.match(/[가-힣A-Za-z0-9]+/g) ?? []).filter((token) => token.length >= 2 && !GENERIC_EXPERIENCE_TOKENS.has(token));
  const matched = tokens.filter((token) => hasTerm(values, token)).length;
  return tokens.length > 1 ? matched >= 2 : matched === 1;
}

function parsePreferredLocation(value: string) {
  const district = DISTRICTS.find((candidate) => value.includes(candidate)) as District | undefined;
  const isUlsan = /울산/.test(value) || Boolean(district);
  return { sido: isUlsan ? "울산" : null, sigungu: district ?? null };
}

function locationMatch(profile: UserProfile, job: Job): NonNullable<JobMatch["location_match"]> {
  const requested = parsePreferredLocation(profile.preferredLocation);
  const work = job.workLocation;
  const jobSido = work?.sido ?? (/울산/.test(job.location) ? "울산" : null);
  const jobDistrict = work?.sigungu ?? null;
  if (requested.sigungu && jobSido === "울산" && jobDistrict === requested.sigungu) {
    return { level: "EXACT_LOCAL_MATCH", requested: requested.sigungu, job_sigungu: jobDistrict, reason: `공고 원문에서 울산 ${jobDistrict} 근무가 확인됩니다.` };
  }
  if (requested.sigungu && jobSido === "울산" && !jobDistrict && job.ulsanStatus === "ULSAN_CONFIRMED") {
    return { level: "ULSAN_BROAD_MATCH", requested: requested.sigungu, job_sigungu: null, reason: "울산 근무는 확인되지만 세부 구·군은 확인되지 않습니다." };
  }
  if (requested.sigungu && jobSido === "울산" && jobDistrict && jobDistrict !== requested.sigungu) {
    return { level: "LOCATION_MISMATCH", requested: requested.sigungu, job_sigungu: jobDistrict, reason: `희망 지역은 ${requested.sigungu}이나 공고 근무지는 ${jobDistrict}입니다.` };
  }
  if (jobSido === "울산" && job.ulsanStatus === "ULSAN_CONFIRMED") {
    return { level: "ULSAN_BROAD_MATCH", requested: requested.sigungu, job_sigungu: jobDistrict, reason: jobDistrict ? `울산 ${jobDistrict} 근무 공고입니다.` : "울산 근무는 확인되지만 세부 구·군은 확인되지 않습니다." };
  }
  return { level: "UNKNOWN", requested: requested.sigungu, job_sigungu: jobDistrict, reason: "공고의 근무지역을 충분히 확인하지 못했습니다." };
}

function locationRank(match: JobMatch) {
  return match.location_match?.level === "EXACT_LOCAL_MATCH" ? 2 : match.location_match?.level === "ULSAN_BROAD_MATCH" ? 1 : 0;
}

function gateEvaluation(profile: UserProfile, job: Job): "PASS" | "FAIL" | "UNVERIFIED" {
  const gates = job.hardGates ?? [];
  if (!gates.length) return "PASS";
  const terms = profileTerms(profile);
  const qualificationTerms = [
    ...profile.certificates,
    ...profile.skills,
    ...profile.careerExperiences,
    ...profile.internshipExperiences,
    ...profile.projectExperiences,
    ...profile.trainingExperiences,
  ];
  let unknown = false;

  for (const gate of gates) {
    const years = gate.match(/(\d+)년\s*이상/);
    if (years) {
      if (typeof profile.yearsExperience !== "number") unknown = true;
      else if (profile.yearsExperience < Number(years[1])) return "FAIL";
      continue;
    }
    const age = gate.match(/만\s*(\d+)세\s*이상/);
    if (age) {
      if (typeof profile.age !== "number") unknown = true;
      else if (profile.age < Number(age[1])) return "FAIL";
      continue;
    }
    if (/면허|자격|전문역량|자격증|기사|요건|응시자격/.test(gate)) {
      const specificQualification = gate.includes("간호") ? ["간호사", "간호조무사"]
        : gate.includes("물리치료") ? ["물리치료사"]
          : gate.includes("사회복지") ? ["사회복지사"]
            : gate.includes("요양보호") ? ["요양보호사"]
              : gate.includes("기록물") ? ["기록물관리"]
                : gate.includes("지게차") ? ["지게차", "지게차운전기능사"]
                  : gate.includes("운전면허") ? ["운전면허", "자동차운전면허"]
                    : [gate, "면허", "자격", "기사"];
      if (!hasAnyTerm(qualificationTerms, specificQualification)) return "FAIL";
      continue;
    }
    if (/전공|학과|학사|대졸|초대졸|고등학교|졸업|학력/.test(gate)) {
      if (!profile.education && !profile.major) unknown = true;
      else if (!hasAnyTerm(terms, [profile.major, gate.replace(/전공|학과|이상|필수/g, "")])) return "FAIL";
      continue;
    }
    if (/운전/.test(gate)) {
      if (!hasAnyTerm(terms, ["운전면허", "자동차운전", "지게차", "운전"])) return "FAIL";
      continue;
    }
    if (/지역|울산 주민|지역인재/.test(gate)) {
      if (!profile.preferredLocation.includes("울산")) unknown = true;
      continue;
    }
    if (/공무원|소방/.test(gate)) {
      if (!hasAnyTerm(terms, ["공무원", "소방", "공공" ])) unknown = true;
      continue;
    }
    unknown = true;
  }
  return unknown ? "UNVERIFIED" : "PASS";
}

function isExplicitPublicServiceInterest(profile: UserProfile) {
  return hasAnyTerm(
    [...profile.interestedIndustries, profile.preferredConditions, profile.experience],
    ["공무원", "소방", "공공기관", "공공직"],
  );
}

function isLowQuality(job: Job) {
  return job.analysisConfidence === "LOW" && job.descriptionQuality === "LOW";
}

function isCurrentEligible(profile: UserProfile, job: Job) {
  if (job.qualityTier === "EXCLUDE" || job.ulsanStatus !== "ULSAN_CONFIRMED") return false;
  if (job.postingStatus !== "OPEN" || job.usageMode !== "CURRENT_OPPORTUNITY") return false;
  if (job.analysisConfidence === "LOW" || isLowQuality(job)) return false;
  if (job.descriptionQuality === "LOW") return false;
  if (job.occupationType === "PUBLIC_SERVICE" && !isExplicitPublicServiceInterest(profile)) return false;
  return gateEvaluation(profile, job) === "PASS";
}

function scoreJob(profile: UserProfile, job: Job): JobMatch | null {
  const terms = profileTerms(profile);
  const taskTerms = [
    ...(job.actualTasks ?? []),
    ...(job.analysisSkills ?? []),
    ...(job.toolsNormalized ?? []),
    ...(job.aiRequiredSkills ?? []),
    ...job.requiredSkills,
    ...(job.transferableSkills ?? []),
  ];
  const matchedSkills = [...new Set(taskTerms.filter((term) => hasTerm(terms, term)))];
  const matchedPreferred = (job.preferredSkills ?? []).filter((term) => hasTerm(terms, term));
  const majorMatched = hasAnyTerm(terms, job.relatedMajors ?? []) || hasTerm([profile.major], job.discoveredRole);
  const taskMatched = (job.actualTasks ?? []).filter((task) => hasAnyTerm(terms, task.split(/[·,/ ]/).filter(Boolean)));
  const suitableExperienceMatched = (job.suitableExperienceExamples ?? []).filter((example) => matchesExperienceExample(terms, example));
  const evidenceCount = new Set([...matchedSkills, ...taskMatched, ...suitableExperienceMatched]).size + (majorMatched ? 1 : 0);
  if (!evidenceCount) return null;

  const score = Math.min(100, Math.round(
    Math.min(55, matchedSkills.length * 12 + taskMatched.length * 6 + suitableExperienceMatched.length * 18) +
    (majorMatched ? 22 : 0) +
    Math.min(13, matchedPreferred.length * 5 + suitableExperienceMatched.length * 3) +
    0,
  ));
  if (score < MINIMUM_SCORE) return null;

  const reasons: string[] = [];
  if (matchedSkills.length) reasons.push(`${matchedSkills.slice(0, 3).join(", ")} 경험이 공고의 실제 업무와 연결됩니다.`);
  if (suitableExperienceMatched.length) reasons.push(`${suitableExperienceMatched[0]} 경험이 공고의 적합 경험 예시와 연결됩니다.`);
  if (majorMatched) reasons.push(`${profile.major} 전공 또는 경험이 ${job.discoveredRole} 직무 기반과 연결됩니다.`);
  if (!reasons.length) return null;
  return {
    job,
    score,
    matchedSkills: [...new Set([...matchedSkills, ...matchedPreferred])],
    missingSkills: job.requiredSkills.filter((skill) => !hasTerm(terms, skill)),
    reasons,
    gateStatus: gateEvaluation(profile, job),
    location_match: locationMatch(profile, job),
  };
}

export function calculateMatch(profile: UserProfile, job: Job): JobMatch {
  return scoreJob(profile, job) ?? {
    job,
    score: 0,
    matchedSkills: [],
    missingSkills: job.requiredSkills,
    reasons: [],
    gateStatus: gateEvaluation(profile, job),
    location_match: locationMatch(profile, job),
  };
}

export function rankJobs(profile: UserProfile, jobs: Job[]) {
  return jobs
    .map((job) => scoreJob(profile, job))
    .filter((match): match is JobMatch => Boolean(match))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function matchJobs(profile: UserProfile, jobs: Job[]) {
  const scored = jobs.map((job) => scoreJob(profile, job)).filter((match): match is JobMatch => Boolean(match));
  const current = scored.filter((match) => isCurrentEligible(profile, match.job));
  const discovery = scored.filter((match) => (
    !isCurrentEligible(profile, match.job) &&
    match.job.qualityTier !== "EXCLUDE" &&
    !(match.job.occupationType === "PUBLIC_SERVICE" && !isExplicitPublicServiceInterest(profile))
  ));
  return {
    current_opportunities: current.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3),
    career_discovery: discovery.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3),
  };
}

export function canUseAsCurrent(profile: UserProfile, job: Job) {
  return isCurrentEligible(profile, job);
}
