import policies from "../../data/ulsan-settlement-policies.json" with { type: "json" };
import type { Job, UserProfile, WelfareService } from "../types";

interface RawPolicy {
  id: string;
  category: string;
  title: string;
  provider: string;
  area_level: "CITY" | "DISTRICT" | "NATIONAL";
  service_area: { sigungu: string | null } | null;
  target: {
    age_min: number | null;
    age_max: number | null;
    employment_condition: string | null;
    income_condition: string | null;
    housing_condition: string | null;
  } | null;
  support: { type: string | null; amount: string | null; description: string | null } | null;
  priority: string | null;
  conditions_original: string[] | null;
  source_url: string | null;
}

const allPolicies = policies as RawPolicy[];

function jobDistrict(job: Job): string | null {
  return job.workLocation?.sigungu ?? null;
}

function areaLabelOf(policy: RawPolicy): string {
  if (policy.area_level === "DISTRICT") return policy.service_area?.sigungu ?? "울산";
  if (policy.area_level === "NATIONAL") return "전국";
  return "울산 전체";
}

function supportSummaryOf(policy: RawPolicy): string {
  return policy.support?.amount ?? policy.support?.type ?? policy.support?.description ?? "";
}

/**
 * 공고 근무지 기준으로 이용 가능성이 있는 복지서비스를 관련성 순으로 최대 3개 반환.
 *
 * 지역(탈락 조건): 공고 구/군 전용 정책 + 울산 전체(CITY) + 전국(NATIONAL)만 포함 —
 * 다른 구/군 전용 정책은 절대 포함하지 않는다. 공고 구/군이 미확정이면 CITY/NATIONAL만.
 *
 * 프로필 적합성(우선순위 점수): 회사 구 전용(+3), 취업 연계형·재직자 대상(+2, "이 회사 취업 시"
 * 시나리오 부합), 구직자 대상(+2, 이 서비스 사용자는 구직자), 자격증 보유자의 응시료·자기개발
 * 지원(+1). 나이 조건은 프로필에 나이가 있을 때만 판정해 미달 시 제외하고, 없으면 조건을
 * 문구로 노출한다. 소득·주거 조건은 판정하지 않고 원문 조건을 그대로 보여준다.
 * 모든 근거 문구는 "확인해볼 수 있습니다" 톤 — 수급 가능을 단정하지 않는다.
 */
export function matchWelfareServices(profile: UserProfile, job: Job): WelfareService[] {
  const district = jobDistrict(job);

  const scored = allPolicies
    .filter((policy) => {
      if (policy.area_level !== "DISTRICT") return true;
      return district !== null && policy.service_area?.sigungu === district;
    })
    .filter((policy) => {
      if (typeof profile.age !== "number") return true;
      const { age_min, age_max } = policy.target ?? {};
      if (typeof age_min === "number" && profile.age < age_min) return false;
      if (typeof age_max === "number" && profile.age > age_max) return false;
      return true;
    })
    .map((policy) => {
      const employment = policy.target?.employment_condition ?? "";
      const isDistrictMatch = policy.area_level === "DISTRICT";
      const employmentLinked = /재직|근로자|근무/.test(employment);
      const jobseekerFit = /미취업|구직/.test(employment);
      const certificationFit = policy.category === "CERTIFICATION_LANGUAGE" && profile.certificates.length > 0;

      let score = 0;
      if (isDistrictMatch) score += 3;
      if (employmentLinked) score += 2;
      if (jobseekerFit) score += 2;
      if (certificationFit) score += 1;
      if (policy.priority === "CORE") score += 1;

      const locationPart = isDistrictMatch
        ? `공고 근무지가 울산 ${policy.service_area?.sigungu}라서 ${policy.service_area?.sigungu} 대상 지원사업입니다.`
        : policy.area_level === "NATIONAL"
          ? "전국 대상 지원사업입니다."
          : "울산 전체 청년 대상 지원사업입니다.";
      const fitPart = employmentLinked
        ? "이 회사에 취업하게 되면 근로자 대상 조건 충족 여부를 확인해볼 수 있습니다."
        : jobseekerFit
          ? "구직 중인 지금 신청 자격을 확인해볼 수 있습니다."
          : "신청 자격을 확인해볼 수 있습니다.";

      const service: WelfareService = {
        id: policy.id,
        title: policy.title,
        category: policy.category,
        provider: policy.provider,
        areaLabel: areaLabelOf(policy),
        supportSummary: supportSummaryOf(policy),
        conditions: (policy.conditions_original ?? []).slice(0, 2),
        reason: `${locationPart} ${fitPart}`,
        sourceUrl: policy.source_url ?? undefined,
      };
      return { service, score, isDistrictMatch };
    })
    .sort((a, b) => b.score - a.score || Number(b.isDistrictMatch) - Number(a.isDistrictMatch));

  return scored.slice(0, 3).map((entry) => entry.service);
}
