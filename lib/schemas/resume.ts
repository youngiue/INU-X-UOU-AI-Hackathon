import { z } from "zod";
import type { UserProfile } from "@/lib/types";

export const MAX_RESUME_TEXT_LENGTH = 30_000;

export const resumeRequestSchema = z.object({
  resumeText: z
    .string({ error: "이력서 본문은 문자열이어야 합니다." })
    .trim()
    .min(1, "이력서 본문을 입력해 주세요.")
    .max(MAX_RESUME_TEXT_LENGTH, `이력서 본문은 ${MAX_RESUME_TEXT_LENGTH.toLocaleString()}자 이하여야 합니다.`),
}).strict();

const nonEmptyItem = z.string().trim().min(1).max(1_000);

export const extractedProfileSchema: z.ZodType<UserProfile> = z.object({
  major: z.string().trim().max(200),
  education: z.string().trim().max(1_000),
  careerExperiences: z.array(nonEmptyItem).max(50),
  internshipExperiences: z.array(nonEmptyItem).max(50),
  projectExperiences: z.array(nonEmptyItem).max(50),
  certificates: z.array(nonEmptyItem).max(50),
  skills: z.array(nonEmptyItem).max(100),
  trainingExperiences: z.array(nonEmptyItem).max(50),
  preferredConditions: z.string().trim().max(1_000),
  interestedIndustries: z.array(nonEmptyItem).max(50),
  usualSearchKeywords: z.array(nonEmptyItem).max(50).default([]),
  experience: z.string().trim().max(5_000),
  preferredLocation: z.string().trim().max(500),
});

export const resumeExtractionSchema = z.object({
  profile: extractedProfileSchema,
  unclassifiedText: z.array(nonEmptyItem).max(50),
});

export type ResumeExtraction = z.infer<typeof resumeExtractionSchema>;

type MaskedDataType = "이메일 주소" | "전화번호" | "주민등록번호";

const sensitivePatterns: Array<{
  type: MaskedDataType;
  replacement: string;
  pattern: RegExp;
}> = [
  {
    type: "주민등록번호",
    replacement: "[마스킹된 주민등록번호]",
    pattern: /(?<!\d)\d{6}\s*[-.]?\s*[1-8]\d{6}(?!\d)/g,
  },
  {
    type: "이메일 주소",
    replacement: "[마스킹된 이메일 주소]",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "전화번호",
    replacement: "[마스킹된 전화번호]",
    pattern: /(?<!\d)(?:(?:\+?82[-.\s]?(?:0)?)|0)(?:1[016789]|2|[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g,
  },
];

export interface MaskResumeTextResult {
  maskedText: string;
  maskedTypes: MaskedDataType[];
}

export function maskResumeText(resumeText: string): MaskResumeTextResult {
  const maskedTypes: MaskedDataType[] = [];
  let maskedText = resumeText;

  for (const { type, replacement, pattern } of sensitivePatterns) {
    let found = false;
    maskedText = maskedText.replace(pattern, () => {
      found = true;
      return replacement;
    });

    if (found) maskedTypes.push(type);
  }

  return { maskedText, maskedTypes };
}
