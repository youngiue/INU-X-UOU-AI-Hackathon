import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { JobMatch, UserProfile } from "@/lib/types";

const explanationsSchema = z.object({
  explanations: z.array(z.object({
    jobId: z.string(),
    reasons: z.array(z.string()).min(1).max(2),
  })),
});

export async function enhanceReasons(profile: UserProfile, matches: JobMatch[]) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
    input: [
      {
        role: "system",
        content: "당신은 울산 청년 커리어 매칭 설명가입니다. 제공된 공고와 사용자 정보에 있는 사실만 사용하세요. 점수를 바꾸거나 합격 가능성을 말하지 말고, 실제 업무와 역량이 연결되는 이유를 간결한 한국어로 설명하세요.",
      },
      { role: "user", content: JSON.stringify({ profile, matches }) },
    ],
    text: { format: zodTextFormat(explanationsSchema, "job_explanations") },
  });

  return response.output_parsed;
}
