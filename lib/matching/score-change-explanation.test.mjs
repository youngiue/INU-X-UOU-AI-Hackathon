import assert from "node:assert/strict";
import test from "node:test";
import { createScoreChangeExplanation } from "./score-change-explanation.ts";

function createMatch(overrides = {}) {
  return {
    job: { id: "job-1" },
    subScores: [{ label: "종합", score: 38, weight: 1 }],
    matchedSkills: ["엑셀"],
    missingSkills: ["데이터 분석"],
    reasons: [],
    ...overrides,
  };
}

test("추가 기술이 일치 기술로 이동한 점수 변경을 설명하고 입력을 수정하지 않는다", () => {
  const original = createMatch();
  const boosted = createMatch({
    subScores: [{ label: "종합", score: 55, weight: 1 }],
    matchedSkills: ["엑셀", "데이터 분석"],
    missingSkills: [],
  });
  const before = structuredClone({ original, boosted });
  const explanation = createScoreChangeExplanation("데이터 분석", original, boosted);

  assert.match(explanation, /일치하는 항목이 늘고, 부족 기술 목록에서는 제외/);
  assert.match(explanation, /38점에서 55점으로 변경/);
  assert.match(explanation, /가정한 모의 결과/);
  assert.deepEqual({ original, boosted }, before);
});

test("점수가 내려가면 상승했다고 표현하지 않는다", () => {
  const explanation = createScoreChangeExplanation(
    "데이터 분석", createMatch(), createMatch({ subScores: [{ label: "종합", score: 30, weight: 1 }] }),
  );
  assert.match(explanation, /30점으로 낮아졌습니다/);
  assert.doesNotMatch(explanation, /상승/);
});

test("점수가 변하지 않으면 상승 또는 변경됐다고 표현하지 않는다", () => {
  const original = createMatch();
  const boosted = createMatch({
    matchedSkills: ["엑셀", "데이터 분석"],
    missingSkills: [],
  });
  const explanation = createScoreChangeExplanation("데이터 분석", original, boosted);

  assert.match(explanation, /38점으로 동일/);
  assert.doesNotMatch(explanation, /상승|점으로 변경/);
});
