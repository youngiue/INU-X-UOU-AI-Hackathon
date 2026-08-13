const METROPOLITAN_ALIASES: Record<string, string> = {
  울산광역시: "울산", 부산광역시: "부산", 대구광역시: "대구",
  인천광역시: "인천", 광주광역시: "광주", 대전광역시: "대전",
  서울특별시: "서울", 세종특별자치시: "세종",
};

const KNOWN_CITIES = new Set(["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종"]);

export function normalizeComparable(value: string): string {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/[\s._-]+/g, "");
}

export interface NormalizedLocation {
  city: string;
  district: string;
  isSpecific: boolean;
  isValid: boolean;
}

export function normalizeLocation(value: string): NormalizedLocation {
  let normalized = value.trim().replace(/\s+/g, " ");
  for (const [longName, shortName] of Object.entries(METROPOLITAN_ALIASES)) {
    normalized = normalized.replace(longName, shortName);
  }
  const tokens = normalized.split(" ").filter(Boolean);
  const city = tokens.find((token) => KNOWN_CITIES.has(token)) ?? "";
  const district = tokens.find((token) => /(?:구|군)$/.test(token)) ?? "";
  return { city, district, isSpecific: Boolean(city && district), isValid: Boolean(city) };
}

export function isLocationMatch(preferred: string, jobLocation: string): boolean {
  const wanted = normalizeLocation(preferred);
  const actual = normalizeLocation(jobLocation);
  if (!wanted.isValid || !actual.isValid || wanted.city !== actual.city) return false;
  if (!wanted.isSpecific) return true;
  return Boolean(actual.isSpecific && wanted.district === actual.district);
}

export interface NormalizedQualification {
  base: "컴퓨터활용능력" | "한국사능력검정시험";
  grade: string | null;
  displayName: string;
}

export function normalizeQualification(value: string): NormalizedQualification | null {
  const compact = normalizeComparable(value);
  let base: NormalizedQualification["base"] | null = null;
  if (/^(?:컴활|컴퓨터활용능력)(?:자격증|시험)?(?:[12]급)?$/.test(compact)) base = "컴퓨터활용능력";
  if (/^(?:한국사|한국사능력검정시험)(?:자격증|시험)?(?:[12]급)?$/.test(compact)) base = "한국사능력검정시험";
  if (!base) return null;
  const grade = compact.match(/([12]급)$/)?.[1] ?? null;
  return { base, grade, displayName: `${base}${grade ? ` ${grade}` : ""}` };
}

export function isExactTermMatch(left: string, right: string): boolean {
  return normalizeComparable(left) === normalizeComparable(right);
}
