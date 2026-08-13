import type { Job, UserProfile } from "../types.ts";
import { cosineSimilarity, embedTexts } from "../openai/embeddings.ts";

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

const QUALIFICATION_GATE_PATTERN = /면허|자격|전문역량|자격증|기사|요건|응시자격|전공|학과|학사|대졸|초대졸|고등학교|졸업|학력/;

function qualificationProfileText(profile: UserProfile) {
  return [...profile.certificates, ...profile.skills, profile.major, profile.education].join(" / ");
}

function qualificationGateText(job: Job) {
  return (job.hardGates ?? []).filter((gate) => QUALIFICATION_GATE_PATTERN.test(gate)).join(" / ");
}

let gateEmbeddingCache: Map<string, number[]> | null = null;
let gateEmbeddingPromise: Promise<Map<string, number[]>> | null = null;

function getGateEmbeddings(jobs: Job[]): Promise<Map<string, number[]>> {
  if (gateEmbeddingCache) return Promise.resolve(gateEmbeddingCache);
  if (!gateEmbeddingPromise) {
    gateEmbeddingPromise = (async () => {
      try {
        const relevantJobs = jobs.filter((job) => qualificationGateText(job).length > 0);
        const vectors = relevantJobs.length ? await embedTexts(relevantJobs.map(qualificationGateText)) : [];
        const map = new Map<string, number[]>();
        if (vectors) relevantJobs.forEach((job, index) => map.set(job.id, vectors[index]));
        gateEmbeddingCache = map;
        return map;
      } catch (error) {
        gateEmbeddingPromise = null;
        throw error;
      }
    })();
  }
  return gateEmbeddingPromise;
}

/**
 * job.id -> 0~100 유사도. 자격증/전공 등 하드게이트 문구와 사용자 자격(자격증·기술·전공·학력) 간
 * 의미 유사도. 키워드 매칭이 실패했을 때만 보조 신호로 사용 — 이 값만으로 게이트를 통과(PASS)
 * 시키지 않고, 애매하면 FAIL 대신 UNVERIFIED로 낮추는 용도로만 쓴다 (자격 요건은 오탐 비용이 큼).
 * 하드게이트가 없는 공고는 대상에서 제외해 불필요한 임베딩 호출을 줄인다.
 */
export async function getQualificationSemanticScores(
  profile: UserProfile,
  jobs: Job[],
): Promise<Map<string, number> | null> {
  try {
    const [profileVectors, gateEmbeddings] = await Promise.all([
      embedTexts([qualificationProfileText(profile)]),
      getGateEmbeddings(jobs),
    ]);
    const profileVector = profileVectors?.[0];
    if (!profileVector || gateEmbeddings.size === 0) return null;

    const scores = new Map<string, number>();
    for (const [jobId, gateVector] of gateEmbeddings) {
      const similarity = cosineSimilarity(profileVector, gateVector);
      scores.set(jobId, Math.round(Math.max(0, Math.min(1, similarity)) * 100));
    }
    return scores;
  } catch (error) {
    console.error("Qualification semantic score fallback:", error);
    return null;
  }
}

function jobRequirementItems(job: Job): string[] {
  return [...(job.preferredSkills ?? []), ...(job.requiredSkills ?? [])].map((item) => item.trim()).filter(Boolean);
}

let requirementItemCache: Map<string, number[]> | null = null;
let requirementItemPromise: Promise<Map<string, number[]>> | null = null;

// 요구사항 문자열 하나하나를 개별 임베딩해 캐싱 (공고 간 중복 문자열은 한 번만)
function getRequirementItemEmbeddings(jobs: Job[]): Promise<Map<string, number[]>> {
  if (requirementItemCache) return Promise.resolve(requirementItemCache);
  if (!requirementItemPromise) {
    requirementItemPromise = (async () => {
      try {
        const uniqueItems = [...new Set(jobs.flatMap(jobRequirementItems))];
        const vectors = uniqueItems.length ? await embedTexts(uniqueItems) : [];
        const map = new Map<string, number[]>();
        if (vectors) uniqueItems.forEach((item, index) => map.set(item, vectors[index]));
        requirementItemCache = map;
        return map;
      } catch (error) {
        requirementItemPromise = null;
        throw error;
      }
    })();
  }
  return requirementItemPromise;
}

/**
 * job.id -> 0~100 유사도. 사용자의 자격증·기술 항목 각각을 공고의 우대사항·필수요건 항목 각각과
 * 1:1로 비교한 최대값. 항목들을 한 덩어리로 합쳐 비교하면 "토익 900점" ↔ "TOEIC 750 이상" 같은
 * 단일 항목 간 강한 연결이 덩어리의 다른 내용에 희석돼 놓친다 — 쌍별 최대값이라 표기 차이
 * (한글 토익 ↔ 영문 TOEIC)도 안정적으로 잡힌다.
 * 매칭 키워드가 하나도 없을 때 "증거"로 인정할지 여부를 판단하는 용도로만 쓴다.
 */
export async function getSkillSemanticScores(profile: UserProfile, jobs: Job[]): Promise<Map<string, number> | null> {
  try {
    const userItems = [...profile.certificates, ...profile.skills].map((item) => item.trim()).filter(Boolean);
    if (!userItems.length) return null;
    const [userVectors, requirementEmbeddings] = await Promise.all([
      embedTexts(userItems),
      getRequirementItemEmbeddings(jobs),
    ]);
    if (!userVectors || requirementEmbeddings.size === 0) return null;

    const scores = new Map<string, number>();
    for (const job of jobs) {
      let best = 0;
      for (const item of jobRequirementItems(job)) {
        const requirementVector = requirementEmbeddings.get(item);
        if (!requirementVector) continue;
        for (const userVector of userVectors) {
          best = Math.max(best, cosineSimilarity(userVector, requirementVector));
        }
      }
      if (best > 0) scores.set(job.id, Math.round(Math.max(0, Math.min(1, best)) * 100));
    }
    return scores;
  } catch (error) {
    console.error("Skill semantic score fallback:", error);
    return null;
  }
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
