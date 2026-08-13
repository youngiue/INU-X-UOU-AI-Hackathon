import baseJobs from "../../data/ulsan-jobs.json" with { type: "json" };
import humanitiesJobs from "../../data/ulsan-humanities-business-jobs.json" with { type: "json" };
import publicJobs from "../../data/ulsan-public-service-jobs.json" with { type: "json" };
import baseAnalysis from "../../data/ulsan-job-analysis.json" with { type: "json" };
import humanitiesAnalysis from "../../data/ulsan-humanities-business-job-analysis.json" with { type: "json" };
import publicAnalysis from "../../data/ulsan-public-service-job-analysis.json" with { type: "json" };
import qualityTiers from "../../data/ulsan-job-quality-tiers.json" with { type: "json" };
import protection from "../../data/ulsan-job-protection.json" with { type: "json" };
import type { Job } from "../types";

type RawRecord = {
  id: string;
  employer?: string;
  employer_normalized?: string;
  posting_title?: string;
  career_name?: string;
  occupation_type?: string;
  work_location?: { raw?: string; sido?: string; sigungu?: "중구" | "남구" | "동구" | "북구" | "울주군" | null; sigungu_candidates?: ("중구" | "남구" | "동구" | "북구" | "울주군")[]; worksites?: { name: string; sigungu: "중구" | "남구" | "동구" | "북구" | "울주군"; detail?: string }[]; detail?: string | null; ulsan_status?: string; location_precision?: Job["locationPrecision"] };
  raw_tasks?: string[];
  hard_gates?: string[];
  licenses_original?: string[];
  preferred_conditions?: string[];
  source?: { source_url?: string; source_type?: string };
  verification_level?: Job["verificationLevel"];
  posting_status?: Job["postingStatus"];
  usage_mode?: Job["usageMode"];
  status_checked_at?: string;
};

type AnalysisRecord = {
  id: string;
  job_family_ai?: string;
  actual_tasks_normalized?: string[];
  skills?: string[];
  tools_normalized?: string[];
  required_skills?: string[];
  transferable_skills?: string[];
  related_roles?: string[];
  suitable_experience_examples?: string[];
  description_quality?: Job["descriptionQuality"];
  discovery_value?: string;
  analysis_confidence?: Job["analysisConfidence"];
  hard_gate_summary?: string[];
  title_task_gap?: { level?: string; reason?: string };
  analysis_note?: string;
};

type ProtectionRecord = {
  id: string;
  quality_tier: NonNullable<Job["qualityTier"]>;
  posting_status: NonNullable<Job["postingStatus"]>;
  usage_mode: NonNullable<Job["usageMode"]>;
  status_checked_at: string;
};

const rawRecords = [...baseJobs, ...humanitiesJobs, ...publicJobs] as RawRecord[];
const analysisRecords = [...baseAnalysis, ...humanitiesAnalysis, ...publicAnalysis] as AnalysisRecord[];
const analysisById = new Map(analysisRecords.map((record) => [record.id, record]));
const tierById = new Map((qualityTiers as ProtectionRecord[]).map((record) => [record.id, record]));
const protectionById = new Map((protection as ProtectionRecord[]).map((record) => [record.id, record]));

function protectionFor(id: string) {
  return protectionById.get(id) ?? tierById.get(id);
}

export const ulsanJobs: Job[] = rawRecords.map((raw) => {
  const analysis = analysisById.get(raw.id);
  const guard = protectionFor(raw.id);
  const actualTasks = analysis?.actual_tasks_normalized ?? [];
  const source = raw.source?.source_url ?? "#";
  return {
    id: raw.id,
    company: raw.employer_normalized ?? raw.employer ?? "울산 채용기관",
    employer: raw.employer_normalized ?? raw.employer,
    title: raw.posting_title ?? raw.career_name ?? "채용공고",
    discoveredRole: analysis?.job_family_ai ?? raw.occupation_type ?? "직무 탐색",
    location: raw.work_location?.raw ?? "울산",
    workLocation: {
      raw: raw.work_location?.raw,
      sido: raw.work_location?.sido,
      sigungu: raw.work_location?.sigungu,
      sigunguCandidates: raw.work_location?.sigungu_candidates,
      worksites: raw.work_location?.worksites,
      ulsanStatus: raw.work_location?.ulsan_status,
    },
    locationPrecision: raw.work_location?.location_precision,
    description: actualTasks.join(" / "),
    requiredSkills: [ ...(analysis?.required_skills ?? []), ...(raw.licenses_original ?? []) ],
    preferredSkills: raw.preferred_conditions ?? [],
    relatedMajors: analysis?.related_roles ?? [],
    sourceUrl: source,
    hardGates: raw.hard_gates ?? [],
    qualityTier: guard?.quality_tier,
    postingStatus: raw.posting_status ?? guard?.posting_status ?? "UNKNOWN",
    usageMode: raw.usage_mode ?? guard?.usage_mode ?? "CAREER_DISCOVERY_REFERENCE",
    analysisConfidence: analysis?.analysis_confidence,
    descriptionQuality: analysis?.description_quality,
    verificationLevel: raw.verification_level,
    ulsanStatus: raw.work_location?.ulsan_status,
    occupationType: raw.occupation_type,
    actualTasks,
    analysisSkills: analysis?.skills ?? [],
    toolsNormalized: analysis?.tools_normalized ?? [],
    aiRequiredSkills: analysis?.required_skills ?? [],
    transferableSkills: analysis?.transferable_skills ?? [],
    relatedRoles: analysis?.related_roles ?? [],
    suitableExperienceExamples: analysis?.suitable_experience_examples ?? [],
    hardGateSummary: analysis?.hard_gate_summary ?? [],
    titleTaskGap: analysis?.title_task_gap,
    discoveryValue: analysis?.discovery_value,
    analysisNote: analysis?.analysis_note,
  };
});

export function assertUlsanDataset() {
  const ids = ulsanJobs.map((job) => job.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const rawIdSet = new Set(rawRecords.map((record) => record.id));
  const missingAnalysis = rawRecords.filter((record) => !analysisById.has(record.id)).map((record) => record.id);
  const orphanAnalysis = analysisRecords.filter((record) => !rawIdSet.has(record.id)).map((record) => record.id);
  const missingProtection = ulsanJobs.filter((job) => !job.qualityTier || !job.postingStatus || !job.usageMode).map((job) => job.id);
  const invalidLocation = ulsanJobs.filter((job) => (
    !job.locationPrecision ||
    !["ADDRESS_CONFIRMED", "SIGUNGU_CONFIRMED", "MULTI_WORKSITE_CONFIRMED", "COMPANY_ADDRESS_FALLBACK", "MULTI_SIGUNGU_CONFIRMED", "SIDO_ONLY", "UNKNOWN"].includes(job.locationPrecision) ||
    job.workLocation?.sido !== "울산" ||
    Boolean(job.workLocation?.sigungu && !["중구", "남구", "동구", "북구", "울주군"].includes(job.workLocation.sigungu))
  )).map((job) => job.id);
  if (ulsanJobs.length !== 79 || analysisRecords.length !== 79 || duplicateIds.length || missingAnalysis.length || orphanAnalysis.length || missingProtection.length || invalidLocation.length) {
    throw new Error(`U-Career dataset invariant failed: raw=${ulsanJobs.length}, analysis=${analysisRecords.length}, duplicate=${duplicateIds.length}, missingAnalysis=${missingAnalysis.length}, orphanAnalysis=${orphanAnalysis.length}, protection=${missingProtection.length}, location=${invalidLocation.length}`);
  }
}

assertUlsanDataset();
