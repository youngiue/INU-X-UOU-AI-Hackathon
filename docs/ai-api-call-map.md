# AI API 호출 위치 정리

임베딩(벡터 유사도)과 GPT(채팅 모델)는 서로 다른 모델이고, 코드에서 호출되는 위치도 완전히 분리되어 있다.

## 임베딩 API — `text-embedding-3-small`

실제 API 호출은 단 한 곳: `lib/openai/embeddings.ts`의 `embedTexts()`.
```ts
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const response = await client.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
```
텍스트를 숫자 벡터로 바꾸기만 하며, 유사도 판단·추론은 하지 않는다.

이 함수를 호출하는 곳은 전부 `lib/matching/semanticScore.ts` 안에 있다:

| 호출부(라인) | 벡터화 대상 | 쓰이는 곳 |
|---|---|---|
| `getJobEmbeddings` (23행 → 28행) | 공고 전체 텍스트 | `getSemanticScores` |
| `getGateEmbeddings` (56행 → 62행) | 공고의 자격 게이트 요건 텍스트 | `getQualificationSemanticScores` |
| `getQualificationSemanticScores` (88행) | 프로필의 자격 관련 텍스트 | `getQualificationSemanticScores` |
| `getRequirementItemEmbeddings` (114행 → 120행) | 공고의 요건 항목 각각 | `getSkillSemanticScores` |
| `getSkillSemanticScores` (146행) | 사용자 스킬/자격증 항목 각각 | `getSkillSemanticScores` |
| `getSemanticScores` (174행) | 프로필 전체 텍스트 | `getSemanticScores` |

벡터 생성 후 유사도 계산(코사인 유사도)은 API 호출이 아니라 같은 파일이 `cosineSimilarity()`(순수 수학, `lib/openai/embeddings.ts:13`)를 직접 불러서 로컬에서 계산한다.

이 세 함수(`getSemanticScores`, `getQualificationSemanticScores`, `getSkillSemanticScores`)는 `lib/matching/calculate.ts`의 `matchJobs()`가 `Promise.all`로 한 번에 호출하고, 그 결과(Map)를 `scoreJob`/`gateEvaluation`에 인자로 넘겨 점수·게이트 판정에 반영한다.

## GPT(채팅) API — `gpt-5.4-mini` (`.env.local`의 `OPENAI_MODEL`, 미설정 시 기본값 `gpt-5.4-nano`)

전부 `getOpenAIClient().responses.parse(...)` 형태로 호출되며, 호출부는 3곳뿐이다.

| 파일 | 함수 | 용도 | 호출 시점 |
|---|---|---|---|
| `lib/openai/explain.ts:63` | `enhanceReasons` | 추천 이유·프로필 연결·보완점 등 설명 문구 생성 | `app/api/match/route.ts`에서 매칭 계산 이후 |
| `lib/openai/extract-profile.ts:10` | `extractProfile` | 업로드된 이력서 텍스트에서 프로필 필드 자동 추출 | 이력서 업로드 시(선택 기능) |
| `lib/openai/infer-certificate-skills.ts:43` | `getInferredCertificateSkills` | 자격증명 → 관련 기술 추론 (web_search 도구 사용) | `matchJobs` 시작 시, 매칭 전에 프로필 보강 |

세 곳 모두 매칭 점수 자체나 게이트 PASS/FAIL 판정에는 관여하지 않는다 — 점수·게이트는 전부 `lib/matching/calculate.ts`의 순수 코드 로직이 결정한 뒤, GPT는 그 결과를 설명하거나(`explain.ts`) 입력을 보강하는 데만(`extract-profile.ts`, `infer-certificate-skills.ts`) 쓰인다.

## 한눈에 정리

```
임베딩(text-embedding-3-small)
  → lib/openai/embeddings.ts (API 호출 1곳)
  → lib/matching/semanticScore.ts (호출부 6곳, 전부 벡터화 용도)
  → 유사도 자체는 코드가 코사인 공식으로 직접 계산 (API 아님)
  → 매칭 점수(기술 적합도)와 게이트 완화(FAIL→UNVERIFIED)에 보조 신호로 반영

GPT(gpt-5.4-mini)
  → lib/openai/explain.ts, extract-profile.ts, infer-certificate-skills.ts (API 호출 3곳)
  → 점수·게이트 판정에는 관여하지 않음
  → 설명 문구 생성 / 이력서 파싱 / 자격증→기술 추론에만 사용
```
