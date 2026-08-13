import fs from "node:fs";

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
const raw = ["ulsan-jobs.json", "ulsan-humanities-business-jobs.json", "ulsan-public-service-jobs.json"].flatMap(read);
const analysis = ["ulsan-job-analysis.json", "ulsan-humanities-business-job-analysis.json", "ulsan-public-service-job-analysis.json"].flatMap(read);
const rawIds = new Set(raw.map((item) => item.id));
const analysisIds = new Set(analysis.map((item) => item.id));
const byId = new Map(analysis.map((item) => [item.id, item]));
const representative = {
  ULSAN_JOB_NEW_HB_003: (item) => item.job_family_ai === "문화콘텐츠·프로그램 운영" && item.actual_tasks_normalized.includes("콘텐츠 자료관리") && item.title_task_gap?.level === "HIGH" && item.analysis_note.includes("직무발견"),
  ULSAN_JOB_NEW_HB_011: (item) => item.job_family_ai === "창업지원·사업행정" && item.actual_tasks_normalized.includes("지원사업 운영"),
  ULSAN_JOB_NEW_HW_001: (item) => item.job_family_ai === "임상간호" && item.hard_gate_summary.includes("간호사 면허 필수"),
  ULSAN_JOB_NEW_HW_003: (item) => item.job_family_ai === "산업간호·보건관리" && item.actual_tasks_normalized.includes("사업장 보건관리"),
  ULSAN_JOB_NEW_PA_004: (item) => item.job_family_ai === "공공금융·소상공인지원" && item.actual_tasks_normalized.includes("신용보증"),
  ULSAN_JOB_NEW_ID_001: (item) => item.job_family_ai === "제조 AI·DX·IT시스템" && item.actual_tasks_normalized.includes("AI·DX 과제 기획 및 수행") && item.tools_normalized.includes("Spring Boot"),
};
const representativeResults = Object.fromEntries(Object.entries(representative).map(([id, check]) => [id, Boolean(byId.get(id) && check(byId.get(id)))]));
const counts = {
  raw: raw.length,
  analysis: analysis.length,
  raw_minus_analysis: [...rawIds].filter((id) => !analysisIds.has(id)),
  analysis_minus_raw: [...analysisIds].filter((id) => !rawIds.has(id)),
  duplicate_raw: raw.map((item) => item.id).filter((id, index, ids) => ids.indexOf(id) !== index),
  step1: raw.filter((item) => /^ULSAN_JOB_\d+$/.test(item.id)).length,
  step2_hb: raw.filter((item) => item.id.startsWith("ULSAN_JOB_NEW_HB_")).length,
  step3_hw: raw.filter((item) => item.id.startsWith("ULSAN_JOB_NEW_HW_")).length,
  step4_pa: raw.filter((item) => item.id.startsWith("ULSAN_JOB_NEW_PA_")).length,
  step4_public_service: raw.filter((item) => item.id.startsWith("ULSAN_PUBLIC_SERVICE_")).length,
  step5_id: raw.filter((item) => item.id.startsWith("ULSAN_JOB_NEW_ID_")).length,
  representative: representativeResults,
};
if (counts.raw !== 79 || counts.analysis !== 79 || counts.raw_minus_analysis.length || counts.analysis_minus_raw.length || counts.duplicate_raw.length || Object.values(representativeResults).some((value) => !value)) {
  throw new Error(JSON.stringify(counts, null, 2));
}
console.log(JSON.stringify(counts, null, 2));
