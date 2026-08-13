"use client";

import { MatchResultList } from "./MatchResultList";
import type { MatchResultListItem } from "./MatchResultList";

export const matchResultExamples: MatchResultListItem[] = [
  {
    jobId: "job-production-management",
    jobTitle: "생산관리 직무",
    companyName: "울산 A기업",
    employmentType: "정규직",
    isHiddenGem: true,
    subScores: [
      { label: "전공 적합도", score: 95, weight: 0.25 },
      { label: "경험 적합도", score: 87, weight: 0.3 },
      { label: "기술 적합도", score: 92, weight: 0.3 },
      { label: "근무조건 적합도", score: 90, weight: 0.15 },
    ],
    onShowReason: () => window.alert("생산관리 직무의 추천 이유를 표시합니다."),
  },
  {
    jobId: "job-facility-maintenance",
    jobTitle: "설비보전 엔지니어",
    companyName: "울산 모빌리티테크",
    employmentType: "정규직",
    isHiddenGem: true,
    subScores: [
      { label: "전공 적합도", score: 88, weight: 0.25 },
      { label: "경험 적합도", score: 78, weight: 0.3 },
      { label: "기술 적합도", score: 84, weight: 0.3 },
      { label: "근무조건 적합도", score: 95, weight: 0.15 },
    ],
    onShowReason: () => window.alert("설비보전 엔지니어의 추천 이유를 표시합니다."),
  },
  {
    jobId: "job-quality-data",
    jobTitle: "품질 데이터 분석",
    companyName: "온산 프로세스",
    employmentType: "계약직",
    subScores: [
      { label: "전공 적합도", score: 75, weight: 0.25 },
      { label: "경험 적합도", score: 72, weight: 0.3 },
      { label: "기술 적합도", score: 80, weight: 0.3 },
      { label: "근무조건 적합도", score: 70, weight: 0.15 },
    ],
    onShowReason: () => window.alert("품질 데이터 분석 직무의 추천 이유를 표시합니다."),
  },
  {
    jobId: "job-process-safety",
    jobTitle: "공정안전 운영",
    companyName: "울산 에너지솔루션",
    employmentType: "인턴",
    subScores: [
      { label: "전공 적합도", score: 65, weight: 0.25 },
      { label: "경험 적합도", score: 58, weight: 0.3 },
      { label: "기술 적합도", score: 68, weight: 0.3 },
      { label: "근무조건 적합도", score: 72, weight: 0.15 },
    ],
    onShowReason: () => window.alert("공정안전 운영 직무의 추천 이유를 표시합니다."),
  },
];

export function MatchResultCardExample() {
  return <MatchResultList results={matchResultExamples} />;
}
