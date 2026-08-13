import assert from "node:assert/strict";
import test from "node:test";
import { isLocationMatch, normalizeQualification } from "./normalize.ts";

test("상세 행정구역은 같은 도시의 다른 구를 제외한다", () => {
  assert.equal(isLocationMatch("울산 동구", "울산 남구"), false);
  assert.equal(isLocationMatch("울산 남구", "울산 동구"), false);
  assert.equal(isLocationMatch("울산 동구", "울산 동구"), true);
});

test("광역 단위는 여러 구를 허용하되 다른 도시의 동구는 구분한다", () => {
  assert.equal(isLocationMatch("울산", "울산 동구"), true);
  assert.equal(isLocationMatch("울산", "울산 남구"), true);
  assert.equal(isLocationMatch("부산 동구", "울산 동구"), false);
});

test("공백과 광역시 표기를 정규화하고 불명확한 위치는 일치시키지 않는다", () => {
  assert.equal(isLocationMatch("  울산광역시   동구 ", "울산 동구"), true);
  assert.equal(isLocationMatch("동구", "울산 동구"), false);
  assert.equal(isLocationMatch("울산 동구", "울산"), false);
  assert.equal(isLocationMatch("", "울산 동구"), false);
});

test("자격증 별칭과 급수를 명시적으로 정규화한다", () => {
  assert.deepEqual(normalizeQualification("컴활"), {
    base: "컴퓨터활용능력", grade: null, displayName: "컴퓨터활용능력",
  });
  assert.equal(normalizeQualification("컴활 1급")?.grade, "1급");
  assert.equal(normalizeQualification("컴활 2급")?.grade, "2급");
  assert.equal(normalizeQualification("한국사")?.grade, null);
  assert.equal(normalizeQualification("한국사 1급")?.displayName, "한국사능력검정시험 1급");
  assert.equal(normalizeQualification("엑셀"), null);
});
