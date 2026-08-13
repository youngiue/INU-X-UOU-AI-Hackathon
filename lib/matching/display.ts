const DISPLAY_NAMES: Record<string, string> = {
  Excel: "엑셀",
  Python: "파이썬",
  React: "리액트",
  Docker: "도커",
  JavaScript: "자바스크립트",
  TypeScript: "타입스크립트",
  데이터분석: "데이터 분석",
};

export function formatRequirement(value: string): string {
  return DISPLAY_NAMES[value] ?? value;
}
