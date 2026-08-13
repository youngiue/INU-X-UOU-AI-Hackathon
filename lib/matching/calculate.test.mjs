import assert from "node:assert/strict";
import test from "node:test";
import { calculateMatch, rankJobs } from "./calculate.ts";

function profile(overrides = {}) {
  return {
    major: "전기전자공학", education: "대학교 재학", careerExperiences: [],
    internshipExperiences: [], projectExperiences: [], certificates: [], skills: ["엑셀"],
    trainingExperiences: [], preferredConditions: "", interestedIndustries: ["제조업"],
    usualSearchKeywords: [], experience: "관련 경험 없음", preferredLocation: "울산 동구", ...overrides,
  };
}

function job(overrides = {}) {
  return {
    id: "job-1", company: "회사", title: "생산기술", discoveredRole: "생산관리",
    location: "울산 동구", employmentType: "정규직", description: "제조업 생산 자료를 관리합니다.",
    requiredSkills: ["엑셀"], preferredSkills: [], relatedMajors: ["전기전자"], sourceUrl: "#",
    ...overrides,
  };
}

test("우연한 부분 문자열 기술 일치를 추천 근거로 사용하지 않는다", () => {
  const result = calculateMatch(profile(), job({ requiredSkills: ["엑셀", "컴활 1급", "SQL"] }));
  assert.equal(result.matchedSkills.includes("엑셀"), true);
  assert.equal(result.matchedSkills.includes("컴활 1급"), false);

  const partial = calculateMatch(profile({ skills: ["Java"] }), job({ requiredSkills: ["JavaScript"] }));
  assert.equal(partial.matchedSkills.includes("JavaScript"), false);
});

test("등급 미확인 자격증은 특정 급수 근거로 표시하지 않는다", () => {
  const unknown = calculateMatch(profile({ certificates: ["컴활"] }), job({ requiredSkills: ["컴활 1급"] }));
  assert.equal(unknown.matchedSkills.includes("컴활 1급"), false);
  const exact = calculateMatch(profile({ certificates: ["컴활 1급"] }), job({ requiredSkills: ["컴활 1급"] }));
  assert.equal(exact.matchedSkills.includes("컴활 1급"), true);
});

test("상세 지역이 다르면 location_match에서 불일치로 구분한다", async () => {
  const matches = await rankJobs(profile(), [
    job({ id: "right", ulsanStatus: "ULSAN_CONFIRMED", locationPrecision: "SIGUNGU_CONFIRMED", workLocation: { sido: "울산", sigungu: "동구" } }),
    job({ id: "wrong-location", location: "울산 남구", ulsanStatus: "ULSAN_CONFIRMED", locationPrecision: "SIGUNGU_CONFIRMED", workLocation: { sido: "울산", sigungu: "남구" } }),
  ]);
  assert.equal(matches.find((item) => item.job.id === "right")?.location_match?.level, "EXACT_LOCAL_MATCH");
  assert.equal(matches.find((item) => item.job.id === "wrong-location")?.location_match?.level, "LOCATION_MISMATCH");
});

test("울산 광역 희망은 여러 구의 관련 공고를 허용한다", async () => {
  const matches = await rankJobs(profile({ preferredLocation: "울산" }), [
    job({ id: "east", location: "울산 동구" }),
    job({ id: "south", location: "울산 남구" }),
  ]);
  assert.deepEqual(new Set(matches.map((item) => item.job.id)), new Set(["east", "south"]));
});
