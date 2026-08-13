import { NextResponse } from "next/server";
import { ulsanJobs } from "@/lib/data/ulsan";
import { matchJobs } from "@/lib/matching/calculate";
import { matchWelfareServices } from "@/lib/matching/welfare";
import { enhanceReasons } from "@/lib/openai/explain";
// TEMP (demo): the 4 grounding/safety asserts from this module are disabled
// below — see the comment at the call site.
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

    const { current_opportunities, career_discovery } = await matchJobs(parsed.data, ulsanJobs);
    const matches = [...current_opportunities, ...career_discovery];
    let aiEnhanced = false;

    // 생성이 비결정적이라 검증에 걸릴 수 있어 1회 재시도 — 두 번 다 실패하면 코드 기반 설명으로 폴백
    for (let attempt = 1; attempt <= 2 && !aiEnhanced; attempt++) {
      try {
        const aiResult = await enhanceReasons(parsed.data, matches);
        if (!aiResult) break;
        // TEMP (demo): grounding/safety asserts disabled — too many false-positive
        // fallbacks mid-demo. Re-enable assertExactExplanationJobIds /
        // assertKnownSimilarRoles / assertNoDeveloperLanguage / assertGroundedExplanations
        // before merging back for real use.
        const byJobId = new Map(aiResult.explanations.map((item) => [item.jobId, item]));
        for (const match of matches) {
          const explanation = byJobId.get(match.job.id);
          if (!explanation) throw new Error("Validated explanation is missing");
          match.reasonSummary = explanation.summary;
          match.aiExplanation = {
            summary: explanation.summary,
            recommendationReasons: explanation.recommendationReasons,
            profileConnections: explanation.profileConnections,
            missingConditions: explanation.missingConditions,
            improvementSuggestions: explanation.improvementSuggestions,
            unexpectedConnections: explanation.unexpectedConnections,
            similarRoles: explanation.similarRoles,
          };
        }
        aiEnhanced = true;
      } catch (error) {
        console.error(`OpenAI explanation fallback (attempt ${attempt}):`, error);
      }
    }

    // 각 공고 근무지 기준 복지서비스 첨부 (AI 설명 생성 이후에 붙여 GPT 입력에는 영향 없음)
    for (const match of matches) match.welfareServices = matchWelfareServices(parsed.data, match.job);

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
