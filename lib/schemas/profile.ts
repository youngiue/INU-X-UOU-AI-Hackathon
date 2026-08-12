import { z } from "zod";

export const profileSchema = z.object({
  major: z.string().trim().min(1, "전공을 입력해 주세요.").max(80),
  education: z.string().trim().max(200).default(""),
  careerExperiences: z.array(z.string().trim().min(1)).max(20).default([]),
  internshipExperiences: z.array(z.string().trim().min(1)).max(20).default([]),
  projectExperiences: z.array(z.string().trim().min(1)).max(20).default([]),
  certificates: z.array(z.string().trim().min(1)).max(30).default([]),
  skills: z.array(z.string().trim().min(1)).min(1, "기술을 한 개 이상 입력해 주세요.").max(20),
  trainingExperiences: z.array(z.string().trim().min(1)).max(20).default([]),
  preferredConditions: z.string().trim().max(500).default(""),
  interestedIndustries: z.array(z.string().trim().min(1)).max(20).default([]),
  experience: z.string().trim().min(5, "경험을 조금 더 자세히 입력해 주세요.").max(5000),
  preferredLocation: z.string().trim().min(1).max(80),
});
