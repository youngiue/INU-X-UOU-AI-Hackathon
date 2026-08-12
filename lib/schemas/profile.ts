import { z } from "zod";

export const profileSchema = z.object({
  major: z.string().trim().min(1, "전공을 입력해 주세요.").max(80),
  skills: z.array(z.string().trim().min(1)).min(1, "기술을 한 개 이상 입력해 주세요.").max(20),
  experience: z.string().trim().min(5, "경험을 조금 더 자세히 입력해 주세요.").max(1200),
  preferredLocation: z.string().trim().min(1).max(80),
});
