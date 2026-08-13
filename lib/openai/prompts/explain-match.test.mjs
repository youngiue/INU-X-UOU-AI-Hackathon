import assert from "node:assert/strict";
import test from "node:test";
import { EXPLAIN_MATCH_SYSTEM_PROMPT } from "./explain-match.ts";

test("프롬프트는 구조화 근거만 설명하고 빈 정보와 환각을 금지한다", () => {
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /오직 제공된 일치 근거와 부족 근거에 기반/);
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /빈 프로필 정보/);
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /기술과 자격증을 서로 바꾸어 해석하지 마세요/);
});

test("프롬프트는 세부 배점과 점수 조작을 금지한다", () => {
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /점수를 계산·수정·보정·추정하지 마세요/);
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /가중치, 세부 배점, 내부 공식/);
});

test("보완 설명에 필요 이유와 현실적인 준비 방향을 요구한다", () => {
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /공고에서 요구되는 이유와 업무/);
  assert.match(EXPLAIN_MATCH_SYSTEM_PROMPT, /관련 교육·프로젝트·자격 확인/);
});
