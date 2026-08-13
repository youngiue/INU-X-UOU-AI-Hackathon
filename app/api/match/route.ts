import { NextResponse } from "next/server";
import { jobs } from "@/data/jobs";
import { rankJobs } from "@/lib/matching/calculate";
import { enhanceReasons } from "@/lib/openai/explain";
import { profileSchema } from "@/lib/schemas/profile";

const sensitivePatterns = [
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /(?:01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4}/,
  /\d{6}[-.\s]?[1-4]\d{6}/,
];

export async function POST(request: Request) {
  try {
    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }

    const serializedProfile = JSON.stringify(parsed.data);
    if (sensitivePatterns.some((pattern) => pattern.test(serializedProfile))) {
      return NextResponse.json(
        { error: "이메일, 전화번호 또는 주민등록번호 형태가 감지되었습니다. 개인정보를 삭제해 주세요." },
        { status: 400 },
      );
    }

    const matches = rankJobs(parsed.data, jobs);
    let aiEnhanced = false;

    try {
      const aiResult = await enhanceReasons(parsed.data, matches);
      if (aiResult) {
        for (const explanation of aiResult.explanations) {
          const match = matches.find((item) => item.job.id === explanation.jobId);
          if (!match) continue;
          match.reasonSummary = explanation.reasonSummary;
          const note = explanation.hiddenGemNote?.trim();
          if (match.isHiddenGem && note && note.toLowerCase() !== "null") {
            match.hiddenGemNote = note;
          }
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
