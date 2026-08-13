import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { JobMatch, UserProfile } from "@/lib/types";

const explanationsSchema = z.object({
  explanations: z.array(
    z.object({
      jobId: z.string(),
      reasonSummary: z.string().min(1).max(300),
      hiddenGemNote: z.string().max(300).nullable(),
    })
  ),
});

export async function enhanceReasons(
  profile: UserProfile,
  matches: JobMatch[]
) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
    input: [
      {
        role: "system",
        content:
          "당신은 울산 청년 커리어 매칭 설명가입니다. 제공된 profile과 matches(job, strengths, gaps, isHiddenGem)에 있는 사실만 사용해 한국어로 설명하세요. 점수를 바꾸거나 합격 가능성을 언급하지 마세요. reasonSummary는 strengths와 실제 업무(discoveredRole)를 연결하는 2문장 이내 설명입니다. isHiddenGem이 true인 항목에는 평소 검색 키워드와 직무명은 다르지만 실제 업무가 연결된다는 점을 강조하는 hiddenGemNote를 작성하고, false인 항목은 hiddenGemNote를 null로 두세요.",
      },
      {
        role: "user",
        content: JSON.stringify({
          profile,
          matches: matches.map((match) => ({
            jobId: match.job.id,
            jobTitle: match.job.title,
            discoveredRole: match.job.discoveredRole,
            usualSearchKeywords: profile.usualSearchKeywords,
            strengths: match.strengths,
            gaps: match.gaps,
            isHiddenGem: match.isHiddenGem,
          })),
        }),
      },
    ],
    text: { format: zodTextFormat(explanationsSchema, "job_explanations") },
  });

  return response.output_parsed;
}
