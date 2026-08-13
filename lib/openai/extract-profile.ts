import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { EXTRACT_PROFILE_SYSTEM_PROMPT } from "@/lib/openai/prompts/extract-profile";
import {
  resumeExtractionSchema,
  type ResumeExtraction,
} from "@/lib/schemas/resume";

export async function extractProfile(maskedResumeText: string): Promise<ResumeExtraction> {
  const response = await getOpenAIClient().responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
    store: false,
    input: [
      { role: "system", content: EXTRACT_PROFILE_SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({ resumeText: maskedResumeText }),
      },
    ],
    text: {
      format: zodTextFormat(resumeExtractionSchema, "resume_profile_extraction"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI returned no parsed profile");
  }

  return response.output_parsed;
}
