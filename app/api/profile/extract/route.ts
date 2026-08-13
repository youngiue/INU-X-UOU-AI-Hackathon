import { NextResponse } from "next/server";
import { extractProfile } from "@/lib/openai/extract-profile";
import {
  maskResumeText,
  MAX_RESUME_TEXT_LENGTH,
  resumeRequestSchema,
} from "@/lib/schemas/resume";

const MAX_REQUEST_BYTES = MAX_RESUME_TEXT_LENGTH * 4 + 1_024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "이력서 본문이 허용된 길이를 초과했습니다." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식을 확인해 주세요." },
      { status: 400 },
    );
  }

  const parsed = resumeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const status = issue?.code === "too_big" ? 413 : 400;
    return NextResponse.json(
      { error: issue?.message ?? "이력서 본문을 확인해 주세요." },
      { status },
    );
  }

  const { maskedText, maskedTypes } = maskResumeText(parsed.data.resumeText);
  const warnings = maskedTypes.length > 0
    ? [`AI 전송 전에 개인정보(${maskedTypes.join(", ")})를 마스킹했습니다.`]
    : [];

  try {
    const result = await extractProfile(maskedText);

    return NextResponse.json({
      profile: result.profile,
      warnings,
      unclassifiedText: result.unclassifiedText,
      aiExtracted: true,
    });
  } catch {
    return NextResponse.json(
      { error: "프로필을 추출하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
