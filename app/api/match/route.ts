import { NextResponse } from "next/server";
import { ulsanJobs } from "@/lib/data/ulsan";
import { matchJobs } from "@/lib/matching/calculate";
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

    const { current_opportunities, career_discovery } = matchJobs(parsed.data, ulsanJobs);
    const matches = [...current_opportunities, ...career_discovery];
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

    const status = current_opportunities.length || career_discovery.length ? "MATCHED" : "NO_MATCH";
    return NextResponse.json({
      status,
      current_opportunities,
      career_discovery,
      matches,
      aiEnhanced,
      ...(status === "NO_MATCH" ? { no_match_reason: "현재 확보된 울산 채용 데이터에서는 입력한 경험과 충분히 연결되는 공고를 확인하지 못했습니다." } : {}),
    });
  } catch {
    return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 });
  }
}
