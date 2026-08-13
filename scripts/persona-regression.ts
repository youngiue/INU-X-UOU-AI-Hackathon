import { ulsanJobs } from "../lib/data/ulsan.ts";
import { matchJobs } from "../lib/matching/calculate.ts";
import type { UserProfile } from "../lib/types.ts";

const profile = (overrides: Partial<UserProfile>): UserProfile => ({
  major: "전공",
  education: "대학교 재학",
  careerExperiences: [],
  internshipExperiences: [],
  projectExperiences: [],
  certificates: [],
  skills: ["문서작성"],
  trainingExperiences: [],
  preferredConditions: "울산",
  interestedIndustries: [],
  experience: "세부 경험 없음",
  preferredLocation: "울산",
  ...overrides,
});

const result = (name: string, pass: boolean) => console.log(`${pass ? "PASS" : "FAIL"}\t${name}`);

const korean = matchJobs(profile({ major: "국어국문", skills: ["기사작성", "교내신문", "SNS 콘텐츠"], experience: "기사작성과 교내신문, SNS 콘텐츠 제작" }), ulsanJobs);
result("국어국문 생산·품질 강제 추천 금지", ![...korean.current_opportunities, ...korean.career_discovery].some((item) => /생산|품질/.test(item.job.discoveredRole)));
result("TEST A 국어국문 실제 콘텐츠 업무 연결", korean.career_discovery.some((item) => item.job.id === "ULSAN_JOB_NEW_HB_002"));

const humanitiesPlanner = matchJobs(profile({ major: "일반 문과", skills: ["행사기획", "프로젝트 운영"], experience: "학생회 행사기획과 프로젝트 운영" }), ulsanJobs);
result("TEST B 문과 행사·프로젝트 탐색 연결", humanitiesPlanner.career_discovery.some((item) => ["ULSAN_JOB_NEW_HB_006", "ULSAN_JOB_NEW_HB_010", "ULSAN_JOB_NEW_PA_003", "ULSAN_JOB_NEW_PA_005"].includes(item.job.id)));

const noNurseLicense = matchJobs(profile({ major: "간호", skills: ["환자응대"], experience: "간호학 전공 수업" }), ulsanJobs);
result("간호사 면허 없는 사용자 간호 CURRENT 차단", !noNurseLicense.current_opportunities.some((item) => /간호/.test(item.job.discoveredRole)));
result("TEST C 간호 면허 미충족 현재추천 차단", !noNurseLicense.current_opportunities.some((item) => ["ULSAN_JOB_NEW_HW_001", "ULSAN_JOB_NEW_HW_003", "ULSAN_JOB_NEW_HW_012"].includes(item.job.id)));

const electricalStudent = matchJobs(profile({ major: "전기전자", skills: ["PLC"], projectExperiences: ["PLC 프로젝트"], experience: "PLC 프로젝트 경험, 경력 0년", preferredLocation: "울산 남구", yearsExperience: 0 }), ulsanJobs);
result("전기전자 신입의 7년 계기직 CURRENT 차단", !electricalStudent.current_opportunities.some((item) => item.job.id === "ULSAN_JOB_004"));
result("전기전자 신입의 계기 직무탐색 허용", electricalStudent.career_discovery.some((item) => item.job.id === "ULSAN_JOB_004"));
result("전기전자 남구 희망 시 정확 지역 우선", electricalStudent.career_discovery[0]?.location_match?.level === "EXACT_LOCAL_MATCH");

const computerNewcomer = matchJobs(profile({ major: "컴퓨터공학", skills: ["Java", "Python", "React"], projectExperiences: ["Java와 React 프로젝트"], experience: "Java, Python, React 프로젝트 경험, 경력 0년", yearsExperience: 0 }), ulsanJobs);
result("컴퓨터 신입에게 경력직만 강제 추천 금지", !computerNewcomer.current_opportunities.some((item) => item.job.hardGates?.some((gate) => /경력\s*3년|경력\s*10년/.test(gate))));
const northInfrastructure = matchJobs(profile({ major: "컴퓨터공학", skills: ["인프라운영"], experience: "서버 인프라 운영 프로젝트", preferredLocation: "울산 북구" }), ulsanJobs);
result("북구 정확 일치와 울산 broad 구분", northInfrastructure.career_discovery.some((item) => item.location_match?.level === "EXACT_LOCAL_MATCH") && northInfrastructure.career_discovery.some((item) => item.location_match?.level === "ULSAN_BROAD_MATCH" || item.location_match?.level === "LOCATION_MISMATCH"));

const nurseWithLicense = matchJobs(profile({ major: "간호", certificates: ["간호사 면허"], skills: ["간호사", "환자관리"], experience: "간호사 면허 보유 및 임상실습", preferredLocation: "울산 남구" }), ulsanJobs);
result("간호사 면허 보유자는 Hard Gate 통과 후보만 허용", nurseWithLicense.current_opportunities.every((item) => item.gateStatus === "PASS"));
result("TEST D 간호 면허 보유 탐색 가능", nurseWithLicense.current_opportunities.some((item) => /간호/.test(item.job.discoveredRole)));

const computerExperienced = matchJobs(profile({ major: "컴퓨터공학", skills: ["Java", "Spring Boot", "웹 애플리케이션 개발"], projectExperiences: ["Java Spring Boot 프로젝트"], experience: "Java 프로젝트 Spring Boot 웹 애플리케이션 개발, 경력 0년", yearsExperience: 0 }), ulsanJobs);
result("TEST E ID001 AI 업무 기반 경력경로 탐색", computerExperienced.career_discovery.some((item) => item.job.id === "ULSAN_JOB_NEW_ID_001") && !computerExperienced.current_opportunities.some((item) => item.job.id === "ULSAN_JOB_NEW_ID_001"));

const unrelated = matchJobs(profile({ major: "철학", skills: ["도자기"], experience: "관련 경험 거의 없음" }), ulsanJobs);
result("관련 경험 부족 시 NO_MATCH 가능", unrelated.current_opportunities.length === 0 && unrelated.career_discovery.length === 0);
result("TEST F 무관 경험은 NO_MATCH", unrelated.current_opportunities.length === 0 && unrelated.career_discovery.length === 0);
