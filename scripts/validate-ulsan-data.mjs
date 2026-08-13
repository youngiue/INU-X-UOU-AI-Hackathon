import fs from "node:fs";

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
const raw = ["ulsan-jobs.json", "ulsan-humanities-business-jobs.json", "ulsan-public-service-jobs.json", "ulsan-electrical-automation-demo-jobs.json"].flatMap((file) => read(file));
const analysis = ["ulsan-job-analysis.json", "ulsan-humanities-business-job-analysis.json", "ulsan-public-service-job-analysis.json", "ulsan-electrical-automation-demo-job-analysis.json"].flatMap((file) => read(file));
const tier = read("ulsan-job-quality-tiers.json");
const protection = read("ulsan-job-protection.json");
const ids = (items) => items.map((item) => item.id);
const rawIds = ids(raw);
const analysisIds = ids(analysis);
const duplicateIds = rawIds.filter((id, index) => rawIds.indexOf(id) !== index);
const tierById = new Map([...tier, ...protection].map((item) => [item.id, item]));
const missingProtection = raw.filter((item) => {
  if (item.demo_enabled) return !item.demo_status || !item.status_checked_at;
  const guard = tierById.get(item.id);
  return !guard?.quality_tier || !(item.posting_status ?? guard.posting_status) || !(item.usage_mode ?? guard.usage_mode) || !(item.status_checked_at ?? guard.status_checked_at);
}).map((item) => item.id);
const precisionValues = new Set(["ADDRESS_CONFIRMED", "SIGUNGU_CONFIRMED", "MULTI_WORKSITE_CONFIRMED", "COMPANY_ADDRESS_FALLBACK", "MULTI_SIGUNGU_CONFIRMED", "SIDO_ONLY", "UNKNOWN"]);
const invalidLocations = raw.filter((item) => {
  const location = item.work_location ?? {};
  const precision = location.location_precision ?? (item.demo_enabled ? "SIGUNGU_CONFIRMED" : undefined);
  const sido = item.demo_enabled && location.sido === "울산광역시" ? "울산" : location.sido;
  return !precisionValues.has(precision) || sido !== "울산" || (location.sigungu && !["중구", "남구", "동구", "북구", "울주군"].includes(location.sigungu)) || (location.sigungu_candidates && (!Array.isArray(location.sigungu_candidates) || location.sigungu_candidates.some((district) => !["중구", "남구", "동구", "북구", "울주군"].includes(district)))) || (location.worksites && (!Array.isArray(location.worksites) || location.worksites.some((site) => !site.name || !["중구", "남구", "동구", "북구", "울주군"].includes(site.sigungu))));
}).map((item) => item.id);

for (const file of ["ulsan-jobs.json", "ulsan-humanities-business-jobs.json", "ulsan-public-service-jobs.json", "ulsan-electrical-automation-demo-jobs.json", "ulsan-job-analysis.json", "ulsan-humanities-business-job-analysis.json", "ulsan-public-service-job-analysis.json", "ulsan-electrical-automation-demo-job-analysis.json", "ulsan-job-quality-tiers.json", "ulsan-job-protection.json", "ulsan-settlement-policies.json"]) read(file);
if (raw.length !== 84 || analysis.length !== 84) throw new Error(`Expected 84/84, got ${raw.length}/${analysis.length}`);
if (JSON.stringify([...rawIds].sort()) !== JSON.stringify([...analysisIds].sort())) throw new Error("RAW/AI IDs do not match");
if (duplicateIds.length || missingProtection.length || invalidLocations.length) throw new Error(`Duplicate IDs: ${duplicateIds.join(",")}; missing protection: ${missingProtection.join(",")}; invalid locations: ${invalidLocations.join(",")}`);
console.log(JSON.stringify({ raw: raw.length, analysis: analysis.length, duplicateIds, missingProtection, invalidLocations, status: "PASS" }, null, 2));
