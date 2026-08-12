import { NextResponse } from "next/server";
import { analyzeProfile } from "@/lib/openai/analyze-profile";

export const runtime = "nodejs";

const sensitivePatterns = [
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /(?:01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4}/,
  /\d{6}[-.\s]?[1-4]\d{6}/,
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profileText = String(formData.get("profileText") ?? "").trim();

    if (!profileText) {
      return NextResponse.json({ error: "개인정보를 제거한 프로필 내용을 입력해 주세요." }, { status: 400 });
    }

    if (profileText.length > 10_000) {
      return NextResponse.json({ error: "프로필 내용은 10,000자 이하로 입력해 주세요." }, { status: 400 });
    }

    if (sensitivePatterns.some((pattern) => pattern.test(profileText))) {
      return NextResponse.json(
        { error: "이메일, 전화번호 또는 주민등록번호 형태가 감지되었습니다. 개인정보를 삭제해 주세요." },
        { status: 400 },
      );
    }

    const analyzed = await analyzeProfile(profileText);

    return NextResponse.json({ profile: analyzed });
  } catch (error) {
    console.error("Profile analysis failed:", error);
    return NextResponse.json(
      { error: "AI 프로필 분석에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
