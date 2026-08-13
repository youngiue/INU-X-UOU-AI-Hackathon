import type { Job, UserProfile } from "@/lib/types";
import { cosineSimilarity, embedTexts } from "@/lib/openai/embeddings";

// 공고 임베딩은 정적 데이터 기준이라 서버 프로세스 생애주기 동안 재사용
let jobEmbeddingCache: Map<string, number[]> | null = null;
let jobEmbeddingPromise: Promise<Map<string, number[]>> | null = null;

function jobEmbeddingText(job: Job) {
  return [job.title, job.discoveredRole, job.description, ...job.requiredSkills, ...job.preferredSkills].join(" / ");
}

function profileEmbeddingText(profile: UserProfile) {
  return [
    ...profile.skills,
    profile.experience,
    ...profile.careerExperiences,
    ...profile.internshipExperiences,
    ...profile.projectExperiences,
    ...profile.trainingExperiences,
  ].join(" / ");
}

function getJobEmbeddings(jobs: Job[]): Promise<Map<string, number[]>> {
  if (jobEmbeddingCache) return Promise.resolve(jobEmbeddingCache);
  if (!jobEmbeddingPromise) {
    jobEmbeddingPromise = (async () => {
      try {
        const vectors = await embedTexts(jobs.map(jobEmbeddingText));
        const map = new Map<string, number[]>();
        if (vectors) jobs.forEach((job, index) => map.set(job.id, vectors[index]));
        jobEmbeddingCache = map;
        return map;
      } catch (error) {
        // 실패한 시도는 캐싱하지 않음 — 다음 요청에서 재시도 가능하게 초기화
        jobEmbeddingPromise = null;
        throw error;
      }
    })();
  }
  return jobEmbeddingPromise;
}

/** job.id -> 0~100 의미 유사도 점수. OpenAI 키가 없거나 호출 실패 시 null (키워드 매칭으로 폴백). */
export async function getSemanticScores(profile: UserProfile, jobs: Job[]): Promise<Map<string, number> | null> {
  try {
    const [profileVectors, jobEmbeddings] = await Promise.all([
      embedTexts([profileEmbeddingText(profile)]),
      getJobEmbeddings(jobs),
    ]);
    const profileVector = profileVectors?.[0];
    if (!profileVector || jobEmbeddings.size === 0) return null;

    const scores = new Map<string, number>();
    for (const job of jobs) {
      const jobVector = jobEmbeddings.get(job.id);
      if (!jobVector) continue;
      const similarity = cosineSimilarity(profileVector, jobVector);
      scores.set(job.id, Math.round(Math.max(0, Math.min(1, similarity)) * 100));
    }
    return scores;
  } catch (error) {
    console.error("Semantic score fallback:", error);
    return null;
  }
}
