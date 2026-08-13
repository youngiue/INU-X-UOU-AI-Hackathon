import assert from "node:assert/strict";
import test from "node:test";
import {
  maskResumeText,
  MAX_RESUME_TEXT_LENGTH,
  resumeExtractionSchema,
  resumeRequestSchema,
} from "./resume.ts";

test("이메일, 전화번호, 주민등록번호를 마스킹한다", () => {
  const result = maskResumeText(
    "연락처 test.user@example.com, 010-1234-5678, 900101-1234567",
  );

  assert.equal(
    result.maskedText,
    "연락처 [마스킹된 이메일 주소], [마스킹된 전화번호], [마스킹된 주민등록번호]",
  );
  assert.deepEqual(result.maskedTypes, ["주민등록번호", "이메일 주소", "전화번호"]);
});

test("국가번호 전화번호와 구분자가 없는 개인정보를 마스킹한다", () => {
  const result = maskResumeText(
    "메일 user@domain.kr 전화 +82 10 9876 5432 식별번호 0012315123456",
  );

  assert.equal(result.maskedText.includes("user@domain.kr"), false);
  assert.equal(result.maskedText.includes("+82 10 9876 5432"), false);
  assert.equal(result.maskedText.includes("0012315123456"), false);
});

test("빈 입력과 길이 제한 초과 입력을 거부한다", () => {
  assert.equal(resumeRequestSchema.safeParse({ resumeText: "   " }).success, false);
  assert.equal(
    resumeRequestSchema.safeParse({ resumeText: "가".repeat(MAX_RESUME_TEXT_LENGTH + 1) }).success,
    false,
  );
});

test("정보가 없는 완전한 빈 프로필 형식을 허용한다", () => {
  const result = resumeExtractionSchema.safeParse({
    profile: {
      major: "",
      education: "",
      careerExperiences: [],
      internshipExperiences: [],
      projectExperiences: [],
      certificates: [],
      skills: [],
      trainingExperiences: [],
      preferredConditions: "",
      interestedIndustries: [],
      experience: "",
      preferredLocation: "",
    },
    unclassifiedText: [],
  });

  assert.equal(result.success, true);
});
