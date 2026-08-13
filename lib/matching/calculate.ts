import type { Job, JobMatch, SkillGap, SkillMatch, SubScore, UserProfile } from "../types";
import { getQualificationSemanticScores, getSemanticScores } from "./semanticScore.ts";
import { isExactTermMatch, normalizeQualification } from "./normalize.ts";

const MINIMUM_SCORE = 24;
// 자격/전공 게이트에서 키워드 매칭이 실패했을 때, 이 유사도 이상이면 FAIL 대신 UNVERIFIED로 완화
const QUALIFICATION_SIMILARITY_THRESHOLD = 70;
const DISTRICTS = ["중구", "남구", "동구", "북구", "울주군"] as const;
type District = (typeof DISTRICTS)[number];

function normalize(value: string) { return value.toLowerCase().replace(/[\s._\-·/]/g, ""); }
function profileTerms(profile: UserProfile) {
  return [profile.major, profile.education, profile.experience, profile.preferredConditions, ...profile.skills, ...profile.certificates, ...profile.interestedIndustries, ...profile.careerExperiences, ...profile.internshipExperiences, ...profile.projectExperiences, ...profile.trainingExperiences].filter(Boolean);
}
function hasTerm(values: string[], target: string) {
  const needle = normalize(target);
  return Boolean(needle) && values.some((value) => { const haystack = normalize(value); return haystack.includes(needle) || needle.includes(haystack); });
}
function hasAnyTerm(values: string[], targets: string[]) { return targets.some((target) => hasTerm(values, target)); }
function matchesRequirement(profile: UserProfile, requirement: string) {
  const qualification = normalizeQualification(requirement);
  if (qualification) {
    return profile.certificates.some((certificate) => {
      const owned = normalizeQualification(certificate);
      return owned?.base === qualification.base && (!qualification.grade || owned.grade === qualification.grade);
    });
  }
  if (profile.skills.some((skill) => isExactTermMatch(skill, requirement))) return true;
  const experiences = [...profile.careerExperiences, ...profile.internshipExperiences, ...profile.projectExperiences, ...profile.trainingExperiences, profile.experience];
  return hasTerm(experiences, requirement);
}
const GENERIC_EXPERIENCE_TOKENS = new Set(["프로젝트", "운영", "기획", "활동", "경험", "작성", "관리", "지원"]);
function matchesExperienceExample(values: string[], example: string) {
  if (hasTerm(values, example)) return true;
  const tokens = (example.match(/[가-힣A-Za-z0-9]+/g) ?? []).filter((token) => token.length >= 2 && !GENERIC_EXPERIENCE_TOKENS.has(token));
  const matched = tokens.filter((token) => hasTerm(values, token)).length;
  return tokens.length > 1 ? matched >= 2 : matched === 1;
}
function parsePreferredLocation(value: string) { const sigungu = DISTRICTS.find((candidate) => value.includes(candidate)) as District | undefined; return { sido: /울산/.test(value) || Boolean(sigungu) ? "울산" : null, sigungu: sigungu ?? null }; }

function locationMatch(profile: UserProfile, job: Job): NonNullable<JobMatch["location_match"]> {
  const requested = parsePreferredLocation(profile.preferredLocation); const work = job.workLocation;
  const jobSido = work?.sido ?? (/울산/.test(job.location) ? "울산" : null); const jobDistrict = work?.sigungu ?? null; const jobDistricts = work?.sigunguCandidates ?? [];
  if (jobSido === "울산" && job.locationPrecision === "MULTI_WORKSITE_CONFIRMED" && (!requested.sigungu || jobDistricts.includes(requested.sigungu))) return { level: "MULTI_WORKSITE_MATCH", requested: requested.sigungu, job_sigungu: null, reason: `근무 가능 지역: ${jobDistricts.join("·")} 사업장. 세부 배치 사업장은 미확정입니다.` };
  if (jobSido === "울산" && job.locationPrecision === "COMPANY_ADDRESS_FALLBACK" && (!requested.sigungu || jobDistrict === requested.sigungu)) return { level: "COMPANY_ADDRESS_FALLBACK", requested: requested.sigungu, job_sigungu: jobDistrict, reason: jobDistrict ? `세부 근무지는 미확인·기업 소재지 기준: 울산 ${jobDistrict}` : "세부 근무지는 미확인·기업 소재지 기준 후보입니다." };
  if (requested.sigungu && jobSido === "울산" && jobDistricts.includes(requested.sigungu)) return { level: job.locationPrecision === "MULTI_WORKSITE_CONFIRMED" ? "MULTI_WORKSITE_MATCH" : "MULTI_SIGUNGU_MATCH", requested: requested.sigungu, job_sigungu: null, reason: `근무 가능 지역: ${jobDistricts.join("·")} 사업장. 세부 배치 사업장은 미확정입니다.` };
  if (requested.sigungu && jobSido === "울산" && jobDistricts.length && !jobDistricts.includes(requested.sigungu)) return { level: "LOCATION_MISMATCH", requested: requested.sigungu, job_sigungu: null, reason: `희망 지역은 ${requested.sigungu}이나 공고의 복수 근무지는 ${jobDistricts.join("·")}입니다.` };
  if (requested.sigungu && jobSido === "울산" && jobDistrict === requested.sigungu) return { level: "EXACT_LOCAL_MATCH", requested: requested.sigungu, job_sigungu: jobDistrict, reason: `공고 원문에서 울산 ${jobDistrict} 근무가 확인됩니다.` };
  if (requested.sigungu && jobSido === "울산" && !jobDistrict && job.ulsanStatus === "ULSAN_CONFIRMED") return { level: "ULSAN_BROAD_MATCH", requested: requested.sigungu, job_sigungu: null, reason: "울산 근무는 확인되지만 세부 구·군은 확인되지 않습니다." };
  if (requested.sigungu && jobSido === "울산" && jobDistrict && jobDistrict !== requested.sigungu) return { level: "LOCATION_MISMATCH", requested: requested.sigungu, job_sigungu: jobDistrict, reason: `희망 지역은 ${requested.sigungu}이나 ${job.locationPrecision === "COMPANY_ADDRESS_FALLBACK" ? "기업 소재지 기준" : "공고 근무지"}는 ${jobDistrict}입니다.` };
  if (jobSido === "울산" && job.ulsanStatus === "ULSAN_CONFIRMED") return { level: "ULSAN_BROAD_MATCH", requested: requested.sigungu, job_sigungu: jobDistrict, reason: jobDistrict ? `울산 ${jobDistrict} 근무 공고입니다.` : "울산 근무는 확인되지만 세부 구·군은 확인되지 않습니다." };
  return { level: "UNKNOWN", requested: requested.sigungu, job_sigungu: jobDistrict, reason: "공고의 근무지역을 충분히 확인하지 못했습니다." };
}
function locationRank(match: JobMatch) { return match.location_match?.level === "EXACT_LOCAL_MATCH" ? 3 : ["MULTI_WORKSITE_MATCH", "MULTI_SIGUNGU_MATCH"].includes(match.location_match?.level ?? "") ? 2 : match.location_match?.level === "COMPANY_ADDRESS_FALLBACK" ? 1.5 : match.location_match?.level === "ULSAN_BROAD_MATCH" ? 1 : 0; }

/**
 * 자격증명/전공명이 키워드로는 안 맞지만 의미상 통하는 경우(예: "지게차운전기능사" 게이트에
 * 프로필 자격증 "지게차 운전 기능사"), 임베딩 유사도가 충분히 높으면 FAIL 대신 UNVERIFIED로
 * 완화한다. 자격 요건은 오탐(false PASS) 비용이 크기 때문에 임베딩만으로 PASS 처리하지는 않음 —
 * "확인 필요" 정도로만 격상시키고, 최종 판단은 UI에서 사용자가 직접 확인하게 한다.
 */
function relaxByQualificationSimilarity(qualificationSemanticScore?: number) {
  return qualificationSemanticScore !== undefined && qualificationSemanticScore >= QUALIFICATION_SIMILARITY_THRESHOLD;
}

function gateEvaluation(profile: UserProfile, job: Job, qualificationSemanticScore?: number): "PASS" | "FAIL" | "UNVERIFIED" {
  const gates = job.hardGates ?? []; if (!gates.length) return "PASS"; const terms = profileTerms(profile); const qualifications = [...profile.certificates, ...profile.skills, ...profile.careerExperiences, ...profile.internshipExperiences, ...profile.projectExperiences, ...profile.trainingExperiences]; let unknown = false;
  for (const gate of gates) {
    const years = gate.match(/(\d+)년\s*이상/); if (years) { if (typeof profile.yearsExperience !== "number") unknown = true; else if (profile.yearsExperience < Number(years[1])) return "FAIL"; continue; }
    const age = gate.match(/만\s*(\d+)세\s*이상/); if (age) { if (typeof profile.age !== "number") unknown = true; else if (profile.age < Number(age[1])) return "FAIL"; continue; }
    if (/면허|자격|전문역량|자격증|기사|요건|응시자격/.test(gate)) { const specific = gate.includes("간호") ? ["간호사", "간호조무사"] : gate.includes("물리치료") ? ["물리치료사"] : gate.includes("사회복지") ? ["사회복지사"] : gate.includes("요양보호") ? ["요양보호사"] : gate.includes("운전면허") ? ["운전면허", "자동차운전면허"] : [gate, "면허", "자격", "기사"]; if (hasAnyTerm(qualifications, specific)) continue; if (relaxByQualificationSimilarity(qualificationSemanticScore)) { unknown = true; continue; } return "FAIL"; }
    if (/전공|학과|학사|대졸|초대졸|고등학교|졸업|학력/.test(gate)) { if (!profile.education && !profile.major) { unknown = true; continue; } if (hasAnyTerm(terms, [profile.major, gate.replace(/전공|학과|이상|필수/g, "")])) continue; if (relaxByQualificationSimilarity(qualificationSemanticScore)) { unknown = true; continue; } return "FAIL"; }
    if (/운전/.test(gate)) { if (!hasAnyTerm(terms, ["운전면허", "자동차운전", "지게차", "운전"])) return "FAIL"; continue; }
    if (/지역|울산 주민|지역인재/.test(gate)) { if (!profile.preferredLocation.includes("울산")) unknown = true; continue; }
    if (/공무원|소방/.test(gate)) { if (!hasAnyTerm(terms, ["공무원", "소방", "공공"])) unknown = true; continue; }
    unknown = true;
  }
  return unknown ? "UNVERIFIED" : "PASS";
}
function isExplicitPublicServiceInterest(profile: UserProfile) { return hasAnyTerm([...profile.interestedIndustries, profile.preferredConditions, profile.experience], ["공무원", "소방", "공공기관", "공공직"]); }
function isCurrentEligible(profile: UserProfile, job: Job, qualificationSemanticScore?: number) { if (job.qualityTier === "EXCLUDE" || job.ulsanStatus !== "ULSAN_CONFIRMED" || job.postingStatus !== "OPEN" || job.usageMode !== "CURRENT_OPPORTUNITY" || job.analysisConfidence === "LOW" || job.descriptionQuality === "LOW") return false; if (job.occupationType === "PUBLIC_SERVICE" && !isExplicitPublicServiceInterest(profile)) return false; return gateEvaluation(profile, job, qualificationSemanticScore) === "PASS"; }

function buildStrengths(profile: UserProfile, job: Job, matchedSkills: string[]): SkillMatch[] { return matchedSkills.slice(0, 8).map((label) => ({ label, sourceContext: profile.skills.includes(label) ? "보유 기술·자격증" : "경험", relatedTo: `${job.discoveredRole} 업무` })); }
function buildGaps(job: Job, matchedSkills: string[]): SkillGap[] { return job.requiredSkills.filter((skill) => !matchedSkills.includes(skill)).slice(0, 2).map((label) => ({ label, suggestion: `${label} 관련 역량 보완 교육 과정을 통해 채울 수 있어요.` })); }

function scoreJob(profile: UserProfile, job: Job, semanticScore?: number, qualificationSemanticScore?: number, bypassMinimumScore = false): JobMatch | null {
  const terms = profileTerms(profile); const taskTerms = [...(job.actualTasks ?? []), ...(job.analysisSkills ?? []), ...(job.toolsNormalized ?? []), ...(job.aiRequiredSkills ?? []), ...job.requiredSkills, ...(job.transferableSkills ?? [])];
  const matchedSkills = [...new Set(taskTerms.filter((term) => matchesRequirement(profile, term)))]; const matchedPreferred = (job.preferredSkills ?? []).filter((term) => matchesRequirement(profile, term)); const majorMatched = hasAnyTerm(terms, job.relatedMajors ?? []) || hasTerm([profile.major], job.discoveredRole); const taskMatched = (job.actualTasks ?? []).filter((task) => hasAnyTerm(terms, task.split(/[·,/ ]/).filter(Boolean))); const suitableExperienceMatched = (job.suitableExperienceExamples ?? []).filter((example) => matchesExperienceExample(terms, example));
  const evidenceCount = new Set([...matchedSkills, ...taskMatched, ...suitableExperienceMatched]).size + (majorMatched ? 1 : 0); if (!evidenceCount) return null;
  let score = Math.min(100, Math.round(Math.min(55, matchedSkills.length * 12 + taskMatched.length * 6 + suitableExperienceMatched.length * 18) + (majorMatched ? 22 : 0) + Math.min(13, matchedPreferred.length * 5 + suitableExperienceMatched.length * 3))); if (semanticScore !== undefined) score = Math.round(score * 0.7 + semanticScore * 0.3); if (!bypassMinimumScore && score < MINIMUM_SCORE) return null;
  const reasons: string[] = []; if (matchedSkills.length) reasons.push(`${matchedSkills.slice(0, 3).join(", ")} 경험이 공고의 실제 업무와 연결됩니다.`); if (suitableExperienceMatched.length) reasons.push(`${suitableExperienceMatched[0]} 경험이 공고의 적합 경험 예시와 연결됩니다.`); if (majorMatched) reasons.push(`${profile.major} 전공 또는 경험이 ${job.discoveredRole} 직무 기반과 연결됩니다.`); if (!reasons.length) return null;
  const strengths = buildStrengths(profile, job, [...new Set([...matchedSkills, ...matchedPreferred])]); const missingSkills = job.requiredSkills.filter((skill) => !hasTerm(terms, skill));
  // 기술 적합도: 필수요건 직접 충족(hasTerm 기반, 정확히 일치할 필요 없음)이 주된 비중,
  // 직접 충족 못 해도 의미상 관련 역량이 있으면(semanticScore) 더 낮은 비중으로 보완
  const requiredMatchRatio = job.requiredSkills.length ? (job.requiredSkills.length - missingSkills.length) / job.requiredSkills.length : 1;
  const skillFitScore = semanticScore !== undefined
    ? Math.round(requiredMatchRatio * 100 * 0.7 + semanticScore * 0.3)
    : Math.round(requiredMatchRatio * 100);
  const subScores: SubScore[] = [{ label: "전공 적합도", score: majorMatched ? 92 : 45, weight: 0.25 }, { label: "경험 적합도", score: taskMatched.length || suitableExperienceMatched.length ? 85 : 30, weight: 0.3 }, { label: "기술 적합도", score: skillFitScore, weight: 0.3 }, { label: "근무조건 적합도", score: Math.round(locationRank({ location_match: locationMatch(profile, job) } as JobMatch) / 3 * 100), weight: 0.15 }];
  const reasonSummary = reasons.join(" "); const usualKeywords = profile.usualSearchKeywords ?? []; const isHiddenGem = usualKeywords.length > 0 && !usualKeywords.some((keyword) => hasTerm([job.title, job.discoveredRole], keyword));
  return { job, score, subScores, matchedSkills: [...new Set([...matchedSkills, ...matchedPreferred])], missingSkills, reasons, reasonSummary, strengths, gaps: buildGaps(job, [...new Set([...matchedSkills, ...matchedPreferred])]), isHiddenGem, hiddenGemNote: isHiddenGem ? `평소 검색 키워드와 직무명은 다르지만 실제 업무(${job.discoveredRole})에 경험이 연결됩니다.` : undefined, gateStatus: gateEvaluation(profile, job, qualificationSemanticScore), location_match: locationMatch(profile, job) };
}

export function calculateMatch(profile: UserProfile, job: Job, semanticScore?: number, qualificationSemanticScore?: number): JobMatch { return scoreJob(profile, job, semanticScore, qualificationSemanticScore) ?? { job, score: 0, subScores: [], matchedSkills: [], missingSkills: job.requiredSkills, reasons: [], reasonSummary: "", strengths: [], gaps: [], isHiddenGem: false, gateStatus: gateEvaluation(profile, job, qualificationSemanticScore), location_match: locationMatch(profile, job) }; }
export async function rankJobs(profile: UserProfile, jobs: Job[]) { const semanticScores = await getSemanticScores(profile, jobs); return jobs.map((job) => scoreJob(profile, job, semanticScores?.get(job.id))).filter((match): match is JobMatch => Boolean(match)).sort((a, b) => b.score - a.score).slice(0, 3); }
export async function matchJobs(profile: UserProfile, jobs: Job[]) {
  const [semanticScores, qualificationSemanticScores] = await Promise.all([
    getSemanticScores(profile, jobs),
    getQualificationSemanticScores(profile, jobs),
  ]);
  const scored = jobs
    .map((job) => scoreJob(profile, job, semanticScores?.get(job.id), qualificationSemanticScores?.get(job.id)))
    .filter((match): match is JobMatch => Boolean(match));
  const current = scored.filter((match) => isCurrentEligible(profile, match.job, qualificationSemanticScores?.get(match.job.id)));
  let discovery = scored.filter((match) => !isCurrentEligible(profile, match.job, qualificationSemanticScores?.get(match.job.id)) && match.job.qualityTier !== "EXCLUDE" && !(match.job.occupationType === "PUBLIC_SERVICE" && !isExplicitPublicServiceInterest(profile)));

  // 24점 미만이라 전부 걸러진 경우, 완전한 무응답(NO_MATCH) 대신 근거가 조금이라도 있는
  // 공고를 낮은 점수 그대로 최소한 보여준다 (하드게이트 PASS 없는 공고만 대상 — current는 그대로 비움)
  if (current.length === 0 && discovery.length === 0) {
    const fallbackScored = jobs
      .map((job) => scoreJob(profile, job, semanticScores?.get(job.id), qualificationSemanticScores?.get(job.id), true))
      .filter((match): match is JobMatch => Boolean(match))
      .filter((match) => match.job.qualityTier !== "EXCLUDE" && !(match.job.occupationType === "PUBLIC_SERVICE" && !isExplicitPublicServiceInterest(profile)));
    discovery = fallbackScored.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3);
  }

  return {
    current_opportunities: current.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3),
    career_discovery: discovery.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3),
  };
}
export function canUseAsCurrent(profile: UserProfile, job: Job, qualificationSemanticScore?: number) { return isCurrentEligible(profile, job, qualificationSemanticScore); }
