import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const analyzedProfileSchema = z.object({
  major: z.string().describe("전공. 알 수 없으면 빈 문자열"),
  education: z.string().describe("최종 학력, 학교와 재학/졸업 상태"),
  careerExperiences: z.array(z.string()).describe("회사 경력. 각 항목은 회사, 직무, 기간, 핵심 업무를 포함"),
  internshipExperiences: z.array(z.string()).describe("인턴 경험"),
  projectExperiences: z.array(z.string()).describe("프로젝트 경험과 본인의 역할 및 성과"),
  certificates: z.array(z.string()).describe("자격증과 어학 자격"),
  skills: z.array(z.string()).describe("기술, 프로그래밍 언어, 소프트웨어와 업무 도구"),
  trainingExperiences: z.array(z.string()).describe("부트캠프, 직업교육, 교내외 교육 경험"),
  preferredConditions: z.string().describe("고용형태, 근무지, 급여 등 희망 근무조건"),
  preferredLocation: z.string().describe("희망 근무지역. 정보가 없으면 울산"),
  interestedIndustries: z.array(z.string()).describe("관심 산업"),
});

export async function analyzeProfile(profileText: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
    input: [
      {
        role: "system",
        content: "당신은 비식별화된 구직자 프로필을 사실에 근거해 구조화하는 커리어 분석가입니다. 제공되지 않은 사실은 추측하지 말고 모든 응답은 한국어로 작성하세요.",
      },
      {
        role: "user",
        content: `다음 프로필을 분석하세요. 명시되지 않은 경력이나 자격은 추측하지 마세요. 같은 사실을 여러 항목에 중복하지 말고, 채용공고와 비교할 수 있을 정도로 구체적으로 요약하세요.\n\n비식별 프로필:\n${profileText}`,
      },
    ],
    text: { format: zodTextFormat(analyzedProfileSchema, "career_profile") },
  });

  if (!response.output_parsed) throw new Error("프로필 분석 결과를 생성하지 못했습니다.");
  return response.output_parsed;
}
