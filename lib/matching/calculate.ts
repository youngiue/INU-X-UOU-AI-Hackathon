import type { Job, JobMatch, SkillGap, SkillMatch, SubScore, UserProfile } from "../types";
import { getQualificationSemanticScores, getSemanticScores, getSkillSemanticScores } from "./semanticScore.ts";
import { isExactTermMatch, normalizeQualification } from "./normalize.ts";
import { getInferredCertificateSkills } from "../openai/infer-certificate-skills.ts";

// 자격/전공 게이트에서 키워드 매칭이 실패했을 때, 이 유사도 이상이면 FAIL 대신 UNVERIFIED로 완화
const QUALIFICATION_SIMILARITY_THRESHOLD = 70;
// 자격증·스킬 키워드가 하나도 안 겹쳐도, 우대사항/필수요건과의 임베딩 유사도가 이 이상이면
// (예: "토익 900점" ↔ "TOEIC 750 이상") 증거로 인정
const SKILL_SEMANTIC_EVIDENCE_THRESHOLD = 45;
const DISTRICTS = ["중구", "남구", "동구", "북구", "울주군"] as const;

function normalize(value: string) { return value.toLowerCase().replace(/[\s._\-·/]/g, ""); }

// "TOEIC 750 이상" 같은 어학점수 요건은 사용자의 "토익 900점"과 숫자로 직접 비교한다
// (임베딩은 한글↔영문 표기 차이에서 유사도가 깎여 이런 명백한 충족을 놓칠 수 있음).
// 별칭 치환은 이 파서 안에서만 적용 — 전역 normalize에 넣으면 "토익"→"toeic"의 "to"가
// "T/O" 같은 짧은 약어와 엉뚱하게 부분 매칭되는 부작용이 생긴다.
const EXAM_ALIASES: [RegExp, string][] = [[/토익\s*스피킹/g, "toeicspeaking"], [/토익/g, "toeic"], [/토플/g, "toefl"], [/오픽/g, "opic"], [/아이엘츠/g, "ielts"]];
const EXAM_SCORE_PATTERN = /(toeicspeaking|toeic|toefl|opic|ielts)[^0-9]*(\d{2,4})/;
// OPIc 등급 서열 (낮음→높음). 숫자 없는 "IM"은 IM1과 IM2 사이의 보수적 위치로 취급
const OPIC_GRADE_ORDER = ["nl", "nm", "nh", "il", "im1", "im", "im2", "im3", "ih", "al"];
const OPIC_GRADE_PATTERN = /opic[^a-z0-9]*(al|ih|im[1-3]?|il|nh|nm|nl)/;
// TOEIC Speaking은 Lv 1~8 단일 숫자 레벨 (일반 점수 패턴의 2자리 이상 조건에 안 걸림)
const TOEIC_SPEAKING_LEVEL_PATTERN = /toeicspeaking[^0-9]*([1-8])(?![0-9])/;
function normalizeExamText(value: string) { let v = value.toLowerCase(); for (const [pattern, replacement] of EXAM_ALIASES) v = v.replace(pattern, replacement); return v.replace(/[\s._\-·/]/g, ""); }
function opicRank(normalized: string): number | null { const m = normalized.match(OPIC_GRADE_PATTERN); return m ? OPIC_GRADE_ORDER.indexOf(m[1]) : null; }
function toeicSpeakingLevel(normalized: string): number | null { const m = normalized.match(TOEIC_SPEAKING_LEVEL_PATTERN); return m ? Number(m[1]) : null; }
// "TOEIC 750 이상" / "OPIc IM2 이상" / "TOEIC Speaking Lv 6" 요건을 사용자의 시험 결과와
// 숫자·등급으로 직접 비교한다. 요건 문구에 여러 시험이 나열된 경우("TOEIC 800 또는 OPIc IM2")
// 하나라도 충족하면 통과(우대사항 나열의 일반적 의미).
// 별칭 치환은 이 파서 안에서만 적용 — 전역 normalize에 넣으면 "토익"→"toeic"의 "to"가
// "T/O" 같은 짧은 약어와 엉뚱하게 부분 매칭되는 부작용이 생긴다.
function matchesExamScore(profile: UserProfile, requirement: string): boolean {
  const required = normalizeExamText(requirement);
  const ownedItems = [...profile.certificates, ...profile.skills].map(normalizeExamText);
  const requiredOpic = opicRank(required);
  if (requiredOpic !== null && ownedItems.some((item) => (opicRank(item) ?? -1) >= requiredOpic)) return true;
  const requiredSpeaking = toeicSpeakingLevel(required);
  if (requiredSpeaking !== null && ownedItems.some((item) => (toeicSpeakingLevel(item) ?? -1) >= requiredSpeaking)) return true;
  const requiredScore = required.match(EXAM_SCORE_PATTERN);
  if (requiredScore && ownedItems.some((item) => { const owned = item.match(EXAM_SCORE_PATTERN); return owned !== null && owned[1] === requiredScore[1] && Number(owned[2]) >= Number(requiredScore[2]); })) return true;
  return false;
}
function profileTerms(profile: UserProfile) {
  return [profile.major, profile.education, profile.experience, profile.preferredConditions, ...profile.skills, ...profile.certificates, ...profile.interestedIndustries, ...profile.careerExperiences, ...profile.internshipExperiences, ...profile.projectExperiences, ...profile.trainingExperiences].filter(Boolean);
}
// 정규화(공백 제거)로 단어가 서로 붙기 때문에, "AI" 같은 짧은 영문 키워드는
// "Maintenance" 안에 우연히 들어있는 "ai"처럼 무관한 단어 내부와 오탐 매칭될 수 있다.
// 2글자 이하 영문/숫자 키워드는 원문 기준 단어 경계(앞뒤가 영문·숫자가 아님)를 요구해 이를 막는다.
const SHORT_LATIN_TOKEN_PATTERN = /^[a-z0-9]{1,2}$/;
function hasTerm(values: string[], target: string) {
  const needle = normalize(target);
  if (!needle) return false;
  if (SHORT_LATIN_TOKEN_PATTERN.test(needle)) {
    const boundaryPattern = new RegExp(`(?<![a-z0-9])${needle}(?![a-z0-9])`, "i");
    return values.some((value) => boundaryPattern.test(value));
  }
  return values.some((value) => { const haystack = normalize(value); return haystack.includes(needle) || needle.includes(haystack); });
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
  if (matchesExamScore(profile, requirement)) return true;
  if (profile.skills.some((skill) => isExactTermMatch(skill, requirement))) return true;
  if (hasTerm(profile.certificates, requirement)) return true;
  if (hasTerm([profile.major, profile.education], requirement)) return true;
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
// 복수 구/군 선택을 지원 — 사용자가 고른 모든 구를 집합으로 반환한다 (첫 번째 구만 잡으면
// "전체 선택"이 오히려 단일 선택보다 불리해지는 역설이 생김)
function parsePreferredLocation(value: string) { const sigungus = DISTRICTS.filter((candidate) => value.includes(candidate)); return { sido: /울산/.test(value) || sigungus.length > 0 ? "울산" : null, sigungus }; }

function locationMatch(profile: UserProfile, job: Job): NonNullable<JobMatch["location_match"]> {
  const requested = parsePreferredLocation(profile.preferredLocation); const work = job.workLocation;
  const wanted = requested.sigungus; const wantedLabel = wanted.length ? wanted.join("·") : null; const wantsDistrict = wanted.length > 0;
  const jobSido = work?.sido ?? (/울산/.test(job.location) ? "울산" : null); const jobDistrict = work?.sigungu ?? null; const jobDistricts = work?.sigunguCandidates ?? [];
  const districtsOverlap = jobDistricts.some((district) => wanted.includes(district)); const districtWanted = jobDistrict !== null && wanted.includes(jobDistrict);
  if (jobSido === "울산" && job.locationPrecision === "MULTI_WORKSITE_CONFIRMED" && (!wantsDistrict || districtsOverlap)) return { level: "MULTI_WORKSITE_MATCH", requested: wantedLabel, job_sigungu: null, reason: `근무 가능 지역: ${jobDistricts.join("·")} 사업장. 세부 배치 사업장은 미확정입니다.` };
  if (jobSido === "울산" && job.locationPrecision === "COMPANY_ADDRESS_FALLBACK" && (!wantsDistrict || districtWanted)) return { level: "COMPANY_ADDRESS_FALLBACK", requested: wantedLabel, job_sigungu: jobDistrict, reason: jobDistrict ? `세부 근무지는 미확인·기업 소재지 기준: 울산 ${jobDistrict}` : "세부 근무지는 미확인·기업 소재지 기준 후보입니다." };
  if (wantsDistrict && jobSido === "울산" && districtsOverlap) return { level: job.locationPrecision === "MULTI_WORKSITE_CONFIRMED" ? "MULTI_WORKSITE_MATCH" : "MULTI_SIGUNGU_MATCH", requested: wantedLabel, job_sigungu: null, reason: `근무 가능 지역: ${jobDistricts.join("·")} 사업장. 세부 배치 사업장은 미확정입니다.` };
  if (wantsDistrict && jobSido === "울산" && jobDistricts.length && !districtsOverlap) return { level: "LOCATION_MISMATCH", requested: wantedLabel, job_sigungu: null, reason: `희망 지역은 ${wantedLabel}이나 공고의 복수 근무지는 ${jobDistricts.join("·")}입니다.` };
  if (wantsDistrict && jobSido === "울산" && districtWanted) return { level: "EXACT_LOCAL_MATCH", requested: wantedLabel, job_sigungu: jobDistrict, reason: `공고 원문에서 울산 ${jobDistrict} 근무가 확인됩니다.` };
  if (wantsDistrict && jobSido === "울산" && !jobDistrict && job.ulsanStatus === "ULSAN_CONFIRMED") return { level: "ULSAN_BROAD_MATCH", requested: wantedLabel, job_sigungu: null, reason: "울산 근무는 확인되지만 세부 구·군은 확인되지 않습니다." };
  if (wantsDistrict && jobSido === "울산" && jobDistrict && !districtWanted) return { level: "LOCATION_MISMATCH", requested: wantedLabel, job_sigungu: jobDistrict, reason: `희망 지역은 ${wantedLabel}이나 ${job.locationPrecision === "COMPANY_ADDRESS_FALLBACK" ? "기업 소재지 기준" : "공고 근무지"}는 ${jobDistrict}입니다.` };
  if (jobSido === "울산" && job.ulsanStatus === "ULSAN_CONFIRMED") return { level: "ULSAN_BROAD_MATCH", requested: wantedLabel, job_sigungu: jobDistrict, reason: jobDistrict ? `울산 ${jobDistrict} 근무 공고입니다.` : "울산 근무는 확인되지만 세부 구·군은 확인되지 않습니다." };
  return { level: "UNKNOWN", requested: wantedLabel, job_sigungu: jobDistrict, reason: "공고의 근무지역을 충분히 확인하지 못했습니다." };
}
function locationRank(match: JobMatch) { return match.location_match?.level === "EXACT_LOCAL_MATCH" ? 3 : ["MULTI_WORKSITE_MATCH", "MULTI_SIGUNGU_MATCH"].includes(match.location_match?.level ?? "") ? 2 : match.location_match?.level === "COMPANY_ADDRESS_FALLBACK" ? 1.5 : match.location_match?.level === "ULSAN_BROAD_MATCH" ? 1 : 0; }
// AI 설명 생성(explain.ts)과 검증(explanation.ts)이 "지역이 실제로 맞는지"를 각자 다시 계산하지
//않고 이 값 하나만 참조하도록, 매칭 결과에 직접 채워 넣는다 — 필드가 비어있으면(undefined)
// 두 곳이 서로 다른 판정을 내릴 수 있어 정확한 설명까지 "거짓 주장"으로 오판되는 버그가 있었음.
const LOCATION_MATCH_LEVELS = new Set(["EXACT_LOCAL_MATCH", "MULTI_WORKSITE_MATCH", "MULTI_SIGUNGU_MATCH", "COMPANY_ADDRESS_FALLBACK", "ULSAN_BROAD_MATCH"]);
function isLocationMatchLevel(level: string | undefined): boolean { return level !== undefined && LOCATION_MATCH_LEVELS.has(level); }

/**
 * 자격증명/전공명이 키워드로는 안 맞지만 의미상 통하는 경우(예: "지게차운전기능사" 게이트에
 * 프로필 자격증 "지게차 운전 기능사"), 임베딩 유사도가 충분히 높으면 FAIL 대신 UNVERIFIED로
 * 완화한다. 자격 요건은 오탐(false PASS) 비용이 크기 때문에 임베딩만으로 PASS 처리하지는 않음 —
 * "확인 필요" 정도로만 격상시키고, 최종 판단은 UI에서 사용자가 직접 확인하게 한다.
 */
function relaxByQualificationSimilarity(qualificationSemanticScore?: number) {
  return qualificationSemanticScore !== undefined && qualificationSemanticScore >= QUALIFICATION_SIMILARITY_THRESHOLD;
}

// 자격 게이트에서 인식하는 직군별 자격/면허 명칭
const PROFESSION_GATES: [RegExp, string[]][] = [
  [/간호조무사/, ["간호조무사"]],
  [/간호/, ["간호사", "간호조무사"]],
  [/물리치료/, ["물리치료사"]],
  [/작업치료/, ["작업치료사"]],
  [/사회복지/, ["사회복지사"]],
  [/요양보호/, ["요양보호사"]],
  [/임상심리/, ["임상심리사"]],
  [/정신건강전문요원/, ["정신건강전문요원"]],
  [/기록물관리/, ["기록물관리"]],
  [/운전면허/, ["운전면허", "자동차운전면허"]],
];
// "화공기사"처럼 게이트 문구에서 구체적 자격증명을 뽑아내는 패턴 ("기사" 단독 같은 일반 접미어는 제외)
const CREDENTIAL_NAME_PATTERN = /[가-힣A-Za-z0-9]+(?:기사|기능사|기술사|관리사|지도사|치료사|복지사|보호사|심리사|영양사|중개사|상담사|전문요원)/g;
const BARE_CREDENTIAL_SUFFIXES = new Set(["기사", "산업기사", "기능사", "기술사"]);
// 전공 게이트 토큰에서 걸러낼 조사·일반어
const GENERIC_MAJOR_TOKENS = new Set(["또는", "및", "등", "무관", "졸업", "기졸업자", "졸업예정자", "학위"]);

// 학력 수준: 박사5 > 석사4 > 학사3 > 초대졸2 > 고졸1 (판단 불가 시 null)
function educationLevelOf(text: string | null | undefined): number | null {
  if (!text) return null;
  if (/박사/.test(text)) return 5;
  if (/석사/.test(text)) return 4;
  if (/초대졸|전문대|전문학사/.test(text)) return 2;
  if (/학사|대졸|대학교\s*졸업|4년제/.test(text)) return 3;
  if (/고졸|고등학교\s*졸업/.test(text)) return 1;
  return null;
}

function gateEvaluation(profile: UserProfile, job: Job, qualificationSemanticScore?: number): "PASS" | "FAIL" | "UNVERIFIED" {
  const gates = job.hardGates ?? []; if (!gates.length) return "PASS"; const terms = profileTerms(profile); const qualifications = [...profile.certificates, ...profile.skills, ...profile.careerExperiences, ...profile.internshipExperiences, ...profile.projectExperiences, ...profile.trainingExperiences]; let unknown = false;
  for (const gate of gates) {
    const years = gate.match(/(\d+)년\s*이상/); if (years) { if (typeof profile.yearsExperience !== "number") unknown = true; else if (profile.yearsExperience < Number(years[1])) return "FAIL"; continue; }
    const age = gate.match(/만\s*(\d+)세\s*이상/); if (age) { if (typeof profile.age !== "number") unknown = true; else if (profile.age < Number(age[1])) return "FAIL"; continue; }
    if (/면허|자격|전문역량|자격증|기사|요건|응시자격/.test(gate)) {
      // 게이트 문구에서 구체적인 직군/자격증명을 찾아 그것만으로 판정한다.
      // "본인 전공 자격증 1개 이상"처럼 구체적 명칭이 없는 문구는 판정 불가(UNVERIFIED) —
      // 예전처럼 "기사"라는 글자만 겹쳐도 통과시키면 전기기사가 화공기사 요건을 통과하는 오탐이 생김.
      const professions = PROFESSION_GATES.filter(([pattern]) => pattern.test(gate)).flatMap(([, names]) => names);
      const credentials = (gate.match(CREDENTIAL_NAME_PATTERN) ?? []).filter((name) => !BARE_CREDENTIAL_SUFFIXES.has(name));
      const specific = [...new Set([...professions, ...credentials])];
      if (!specific.length) { unknown = true; continue; }
      if (hasAnyTerm(qualifications, specific)) continue;
      if (relaxByQualificationSimilarity(qualificationSemanticScore)) { unknown = true; continue; }
      return "FAIL";
    }
    if (/전공|학과|학사|석사|박사|학위|대졸|초대졸|고등학교|졸업|학력/.test(gate)) {
      if (!profile.education && !profile.major) { unknown = true; continue; }
      // 학력 수준 요건("학사 이상" 등)은 수준 비교로 판정 — 재학 중 등 수준 판단 불가 시 UNVERIFIED
      const requiredLevel = educationLevelOf(gate);
      if (requiredLevel !== null) {
        const userLevel = educationLevelOf(profile.education);
        if (userLevel === null) { unknown = true; continue; }
        if (userLevel >= requiredLevel) continue;
        return "FAIL";
      }
      // 전공 요건은 게이트 문구의 전공 토큰을 사용자의 전공/학력과만 비교한다
      // (사용자 프로필 전체(terms)와 profile.major를 비교하면 자기 자신과 매칭돼 무조건 통과하는 버그가 있었음)
      const majorTokens = gate.replace(/전공|학과|이상|필수|관련|계열|우대/g, " ").split(/[\s·,/()]+/).filter((token) => token.length >= 2 && !GENERIC_MAJOR_TOKENS.has(token));
      if (!majorTokens.length) { unknown = true; continue; }
      if (hasAnyTerm([profile.major, profile.education].filter(Boolean), majorTokens)) continue;
      if (relaxByQualificationSimilarity(qualificationSemanticScore)) { unknown = true; continue; }
      return "FAIL";
    }
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

function scoreJob(profile: UserProfile, job: Job, semanticScore?: number, qualificationSemanticScore?: number, skillSemanticScore?: number): JobMatch | null {
  const terms = profileTerms(profile); const taskTerms = [...(job.actualTasks ?? []), ...(job.analysisSkills ?? []), ...(job.toolsNormalized ?? []), ...(job.aiRequiredSkills ?? []), ...job.requiredSkills, ...(job.transferableSkills ?? [])];
  const matchedSkills = [...new Set(taskTerms.filter((term) => matchesRequirement(profile, term)))]; const matchedPreferred = (job.preferredSkills ?? []).filter((term) => matchesRequirement(profile, term)); const majorMatched = hasAnyTerm(terms, job.relatedMajors ?? []) || hasTerm([profile.major], job.discoveredRole); const taskMatched = (job.actualTasks ?? []).filter((task) => hasAnyTerm(terms, task.split(/[·,/ ]/).filter(Boolean))); const suitableExperienceMatched = (job.suitableExperienceExamples ?? []).filter((example) => matchesExperienceExample(terms, example));
  const skillSemanticMatched = skillSemanticScore !== undefined && skillSemanticScore >= SKILL_SEMANTIC_EVIDENCE_THRESHOLD;
  const evidenceCount = new Set([...matchedSkills, ...taskMatched, ...suitableExperienceMatched, ...matchedPreferred]).size + (majorMatched ? 1 : 0) + (skillSemanticMatched ? 1 : 0); if (!evidenceCount) return null;
  let score = Math.min(100, Math.round(Math.min(55, matchedSkills.length * 12 + taskMatched.length * 6 + suitableExperienceMatched.length * 18) + (majorMatched ? 22 : 0) + Math.min(13, matchedPreferred.length * 5 + suitableExperienceMatched.length * 3))); if (semanticScore !== undefined) score = Math.round(score * 0.7 + semanticScore * 0.3);
  const reasons: string[] = []; if (matchedSkills.length) reasons.push(`${matchedSkills.slice(0, 3).join(", ")} 경험이 공고의 실제 업무와 연결됩니다.`); if (suitableExperienceMatched.length) reasons.push(`${suitableExperienceMatched[0]} 경험이 공고의 적합 경험 예시와 연결됩니다.`); if (majorMatched) reasons.push(`${profile.major} 전공 또는 경험이 ${job.discoveredRole} 직무 기반과 연결됩니다.`); if (!matchedSkills.length && matchedPreferred.length) reasons.push(`${matchedPreferred.slice(0, 2).join(", ")} 우대사항과 연결됩니다.`); if (!reasons.length && skillSemanticMatched) reasons.push(`보유 자격·기술이 공고의 우대사항·필수요건과 의미상 연결됩니다.`); if (!reasons.length) return null;
  // missingSkills는 matchedSkills와 같은 매처(matchesRequirement)의 여집합이어야 함 —
  // 다른 매처(hasTerm)를 쓰면 같은 스킬이 "보유"와 "부족"에 동시에 잡히는 모순이 생김
  const strengths = buildStrengths(profile, job, [...new Set([...matchedSkills, ...matchedPreferred])]); const missingSkills = job.requiredSkills.filter((skill) => !matchesRequirement(profile, skill));
  // 기술 적합도: 필수요건 직접 충족(hasTerm 기반, 정확히 일치할 필요 없음)이 주된 비중,
  // 직접 충족 못 해도 의미상 관련 역량이 있으면(semanticScore) 더 낮은 비중으로 보완
  const requiredMatchRatio = job.requiredSkills.length ? (job.requiredSkills.length - missingSkills.length) / job.requiredSkills.length : 1;
  const skillFitScore = semanticScore !== undefined
    ? Math.round(requiredMatchRatio * 100 * 0.7 + semanticScore * 0.3)
    : Math.round(requiredMatchRatio * 100);
  const subScores: SubScore[] = [{ label: "전공 적합도", score: majorMatched ? 92 : 45, weight: 0.25 }, { label: "경험 적합도", score: taskMatched.length || suitableExperienceMatched.length ? 85 : 30, weight: 0.3 }, { label: "기술 적합도", score: skillFitScore, weight: 0.3 }, { label: "근무조건 적합도", score: Math.round(locationRank({ location_match: locationMatch(profile, job) } as JobMatch) / 3 * 100), weight: 0.15 }];
  const reasonSummary = reasons.join(" "); const usualKeywords = profile.usualSearchKeywords ?? []; const isHiddenGem = usualKeywords.length > 0 && !usualKeywords.some((keyword) => hasTerm([job.title, job.discoveredRole], keyword));
  const locationMatchResult = locationMatch(profile, job);
  return { job, score, subScores, matchedSkills: [...new Set([...matchedSkills, ...matchedPreferred])], missingSkills, reasons, reasonSummary, strengths, gaps: buildGaps(job, [...new Set([...matchedSkills, ...matchedPreferred])]), isHiddenGem, hiddenGemNote: isHiddenGem ? `평소 검색 키워드와 직무명은 다르지만 실제 업무(${job.discoveredRole})에 경험이 연결됩니다.` : undefined, gateStatus: gateEvaluation(profile, job, qualificationSemanticScore), location_match: locationMatchResult, locationMatch: isLocationMatchLevel(locationMatchResult.level) };
}

export function calculateMatch(profile: UserProfile, job: Job, semanticScore?: number, qualificationSemanticScore?: number, skillSemanticScore?: number): JobMatch {
  const scored = scoreJob(profile, job, semanticScore, qualificationSemanticScore, skillSemanticScore);
  if (scored) return scored;
  const locationMatchResult = locationMatch(profile, job);
  return { job, score: 0, subScores: [], matchedSkills: [], missingSkills: job.requiredSkills, reasons: [], reasonSummary: "", strengths: [], gaps: [], isHiddenGem: false, gateStatus: gateEvaluation(profile, job, qualificationSemanticScore), location_match: locationMatchResult, locationMatch: isLocationMatchLevel(locationMatchResult.level) };
}
export async function rankJobs(profile: UserProfile, jobs: Job[]) { const semanticScores = await getSemanticScores(profile, jobs); return jobs.map((job) => scoreJob(profile, job, semanticScores?.get(job.id))).filter((match): match is JobMatch => Boolean(match)).sort((a, b) => b.score - a.score).slice(0, 3); }
export async function matchJobs(profile: UserProfile, jobs: Job[]) {
  // 자격증이 실제로 검증하는 능력을 추론해 매칭용 기술로 추가 (예: ADsP → 데이터 분석 기초).
  // 매칭 계산에만 쓰고 원본 profile은 유지 — 사용자가 직접 입력한 기술과 추론 기술을 섞어
  // "직접 보유"처럼 설명하지 않기 위함 (설명 생성은 원본 profile을 받음).
  const inferredSkills = await getInferredCertificateSkills(profile.certificates);
  const matchingProfile: UserProfile = inferredSkills.length ? { ...profile, skills: [...new Set([...profile.skills, ...inferredSkills])] } : profile;
  const [semanticScores, qualificationSemanticScores, skillSemanticScores] = await Promise.all([
    getSemanticScores(matchingProfile, jobs),
    getQualificationSemanticScores(matchingProfile, jobs),
    getSkillSemanticScores(matchingProfile, jobs),
  ]);
  const scored = jobs
    .map((job) => scoreJob(matchingProfile, job, semanticScores?.get(job.id), qualificationSemanticScores?.get(job.id), skillSemanticScores?.get(job.id)))
    .filter((match): match is JobMatch => Boolean(match));
  const current = scored.filter((match) => isCurrentEligible(matchingProfile, match.job, qualificationSemanticScores?.get(match.job.id)));
  const discovery = scored.filter((match) => !isCurrentEligible(matchingProfile, match.job, qualificationSemanticScores?.get(match.job.id)) && match.job.qualityTier !== "EXCLUDE" && !(match.job.occupationType === "PUBLIC_SERVICE" && !isExplicitPublicServiceInterest(profile)));

  return {
    current_opportunities: current.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3),
    career_discovery: discovery.sort((a, b) => locationRank(b) - locationRank(a) || b.score - a.score).slice(0, 3),
  };
}
export function canUseAsCurrent(profile: UserProfile, job: Job, qualificationSemanticScore?: number) { return isCurrentEligible(profile, job, qualificationSemanticScore); }
