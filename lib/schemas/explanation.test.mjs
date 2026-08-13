import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExactExplanationJobIds,
  assertGroundedExplanations,
  assertKnownSimilarRoles,
  assertNoDeveloperLanguage,
  explanationsSchema,
} from "./explanation.ts";

function createExplanation(overrides = {}) {
  return {
    jobId: "job-1",
    summary: "입력된 기술과 공고 요구 기술이 연결됩니다.",
    recommendationReasons: ["등록한 타입스크립트 기술이 공고 요구 기술과 일치합니다."],
    profileConnections: [],
    missingConditions: [],
    improvementSuggestions: [],
    unexpectedConnections: [],
    similarRoles: [],
    ...overrides,
  };
}

test("확장된 설명 응답과 선택 설명의 빈 배열을 허용한다", () => {
  const result = explanationsSchema.safeParse({ explanations: [createExplanation()] });
  assert.equal(result.success, true);
});

test("필수 요약과 추천 이유가 비어 있으면 거부한다", () => {
  assert.equal(explanationsSchema.safeParse({
    explanations: [createExplanation({ summary: "" })],
  }).success, false);
  assert.equal(explanationsSchema.safeParse({
    explanations: [createExplanation({ recommendationReasons: [] })],
  }).success, false);
});

test("비슷한 직무는 최대 3개만 허용한다", () => {
  const similarRoles = Array.from({ length: 4 }, (_, index) => ({
    role: `직무 ${index}`,
    reason: "입력 근거가 있습니다.",
  }));
  assert.equal(explanationsSchema.safeParse({
    explanations: [createExplanation({ similarRoles })],
  }).success, false);
});

test("비슷한 직무 객체의 추가 필드를 거부한다", () => {
  const result = explanationsSchema.safeParse({
    explanations: [createExplanation({
      similarRoles: [{ role: "개발자", reason: "기술이 연결됩니다.", company: "임의 회사" }],
    })],
  });
  assert.equal(result.success, false);
});

test("입력 공고 후보에 없는 비슷한 직무를 거부한다", () => {
  const result = {
    explanations: [createExplanation({
      similarRoles: [{ role: "임의 직무", reason: "근거 없는 직무입니다." }],
    })],
  };
  assert.throws(() => assertKnownSimilarRoles(result, ["생산관리 담당자"]));
});

test("입력 공고 후보에 있는 비슷한 직무를 허용한다", () => {
  const result = {
    explanations: [createExplanation({
      similarRoles: [{ role: "생산관리 담당자", reason: "자료 관리 업무가 공통됩니다." }],
    })],
  };
  assert.doesNotThrow(() => assertKnownSimilarRoles(result, ["생산관리 담당자"]));
});

test("정의되지 않은 설명 필드와 빈 문자열을 거부한다", () => {
  assert.equal(explanationsSchema.safeParse({
    explanations: [createExplanation({ extraField: "허용되지 않음" })],
  }).success, false);
  assert.equal(explanationsSchema.safeParse({
    explanations: [createExplanation({ missingConditions: ["   "] })],
  }).success, false);
});

test("중복, 누락, 알 수 없는 jobId를 기존과 같이 거부한다", () => {
  assert.throws(() => assertExactExplanationJobIds({ explanations: [
    createExplanation({ jobId: "job-1" }),
    createExplanation({ jobId: "job-1" }),
  ] }, ["job-1", "job-2"]));
  assert.throws(() => assertExactExplanationJobIds({
    explanations: [createExplanation({ jobId: "job-1" })],
  }, ["job-1", "job-2"]));
  assert.throws(() => assertExactExplanationJobIds({ explanations: [
    createExplanation({ jobId: "job-1" }),
    createExplanation({ jobId: "unknown-job" }),
  ] }, ["job-1", "job-2"]));
});

test("공백이 추가된 jobId를 원래 ID와 같다고 취급하지 않는다", () => {
  assert.throws(() => assertExactExplanationJobIds({
    explanations: [createExplanation({ jobId: " job-1 " })],
  }, ["job-1"]));
});

test("개발용 표현과 JSON 형태가 노출되면 결과 전체를 거부한다", () => {
  assert.throws(() => assertNoDeveloperLanguage({ explanations: [
    createExplanation({ summary: "matchedSkills 배열을 확인했습니다." }),
  ] }));
  assert.throws(() => assertNoDeveloperLanguage({ explanations: [
    createExplanation({ summary: "{기술: 엑셀} 형태입니다." }),
  ] }));
});

test("지역 불일치와 미보유 자격증 급수 주장을 거부한다", () => {
  const match = {
    job: { id: "job-1" }, score: 10, matchedSkills: [], missingSkills: [], reasons: [],
    locationMatch: false,
  };
  const profile = { certificates: [], careerExperiences: [], internshipExperiences: [], projectExperiences: [], skills: [], trainingExperiences: [], interestedIndustries: [] };
  assert.throws(() => assertGroundedExplanations({ explanations: [
    createExplanation({ summary: "희망 근무지역과 일치합니다." }),
  ] }, [match], profile));
  assert.throws(() => assertGroundedExplanations({ explanations: [
    createExplanation({ summary: "컴퓨터활용능력 1급을 보유하고 있습니다." }),
  ] }, [match], profile));
});
