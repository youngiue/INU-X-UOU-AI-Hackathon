import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getOpenAIClient } from "./client.ts";

const inferredSchema = z.object({
  certificates: z.array(
    z.object({
      certification: z.string(),
      inferredSkills: z.array(z.string().trim().min(1).max(40)).max(6),
    }),
  ),
});

const SYSTEM_PROMPT = `당신은 한국 자격증·시험이 실제로 검증하는 능력을 보수적으로 정리하는 분석기입니다.

원칙:
- 각 자격증에 대해 그 자격증 시험이 실제로 평가·검증하는 범위의 능력만 나열하세요.
- 자격증 하나로 과도한 능력을 추론하지 마세요. 예: ADsP는 데이터 분석 기초·데이터 이해까지이며 Python 고급 개발이나 머신러닝 모델 개발이 아닙니다. 컴퓨터활용능력은 Excel·스프레드시트 활용까지이며 VBA 고급 개발이 아닙니다.
- 어학 시험(TOEIC, OPIc, TOEFL, IELTS 등)은 해당 시험이 평가하는 영역만 반영하세요. TOEIC은 영어 듣기·읽기, OPIc과 TOEIC Speaking은 영어 말하기입니다. 점수·등급이 낮거나 없으면 능력 수준을 과장하지 마세요.
- 확실히 알지 못하는 자격증은 웹 검색으로 어떤 능력을 검증하는 자격증인지 확인한 뒤 정리하세요. 검색으로도 확인되지 않으면 능력을 지어내지 말고 inferredSkills를 빈 배열로 반환하세요.
- 능력 명칭은 채용공고에서 쓰일 법한 간결한 한국어 단어·구로 작성하세요 (예: "데이터 분석 기초", "Excel 활용", "전기설비 설계").
- 입력된 각 자격증마다 정확히 하나의 항목을 반환하세요.`;

// 자격증명 → 추론된 기술 목록. 정적 데이터가 아니라 사용자 입력이므로 프로세스 생애주기 동안
// 이름 단위로 캐싱해 같은 자격증에 대한 중복 API 호출을 막는다.
const inferenceCache = new Map<string, string[]>();

/**
 * 자격증 목록에서 각 자격증이 실제로 검증하는 능력을 OpenAI로 추론해 평탄화된 기술 목록으로
 * 반환한다. 하드코딩 매핑 없이 임의의 자격증을 처리하되, 프롬프트에서 과잉 추론을 금지한다.
 * API 키가 없거나 호출이 실패하면 빈 배열을 반환해 키워드·임베딩 매칭만으로 동작한다 (폴백).
 * web_search 도구를 활성화해 모델이 생소한 자격증은 검색으로 확인할 수 있게 한다 —
 * 잘 알려진 자격증은 모델이 검색 없이 답하므로 불필요한 지연이 생기지 않는다.
 */
export async function getInferredCertificateSkills(certificates: string[]): Promise<string[]> {
  const names = [...new Set(certificates.map((name) => name.trim()).filter(Boolean))];
  if (!names.length || !process.env.OPENAI_API_KEY) return [];

  const uncached = names.filter((name) => !inferenceCache.has(name));
  if (uncached.length) {
    try {
      const client = getOpenAIClient();
      const response = await client.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ 자격증목록: uncached }) },
        ],
        text: { format: zodTextFormat(inferredSchema, "certificate_skills") },
      });
      const parsed = response.output_parsed;
      if (parsed) {
        for (const entry of parsed.certificates) {
          const requested = uncached.find((name) => name === entry.certification.trim());
          if (requested) inferenceCache.set(requested, entry.inferredSkills);
        }
      }
      // 모델이 누락한 자격증은 빈 배열로 캐싱해 요청마다 재시도하지 않는다
      for (const name of uncached) if (!inferenceCache.has(name)) inferenceCache.set(name, []);
    } catch (error) {
      console.error("Certificate skill inference fallback:", error);
      return names.flatMap((name) => inferenceCache.get(name) ?? []);
    }
  }

  return names.flatMap((name) => inferenceCache.get(name) ?? []);
}
