import { NextResponse } from "next/server";
import { jobs } from "@/data/jobs";
import { rankJobs } from "@/lib/matching/calculate";
import { enhanceReasons } from "@/lib/openai/explain";
import { profileSchema } from "@/lib/schemas/profile";

export async function POST(request: Request) {
  try {
    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }

    const matches = rankJobs(parsed.data, jobs);
    let aiEnhanced = false;

    try {
      const aiResult = await enhanceReasons(parsed.data, matches);
      if (aiResult) {
        for (const explanation of aiResult.explanations) {
          const match = matches.find((item) => item.job.id === explanation.jobId);
          if (match) match.reasons = explanation.reasons;
        }
        aiEnhanced = true;
      }
    } catch (error) {
      console.error("OpenAI explanation fallback:", error);
    }

    return NextResponse.json({ matches, aiEnhanced });
  } catch {
    return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 });
  }
}
