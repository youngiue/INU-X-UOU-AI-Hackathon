"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProfileInputForm, type ProfileFormData } from "@/components/profile/ProfileInputForm";
import { MatchReasonDetail, type MatchReasonDetailProps } from "@/components/results/MatchReasonDetail";
import { MatchResultList, type MatchResultListItem } from "@/components/results/MatchResultList";

type DemoStep = "profile" | "results" | "detail";

interface DemoJob {
  result: Omit<MatchResultListItem, "onShowReason">;
  detail: MatchReasonDetailProps;
}

const demoJobs: DemoJob[] = [
  {
    result: {
      jobId: "job-scm",
      jobTitle: "SCM 운영",
      companyName: "울산 A기업",
      employmentType: "정규직",
      isHiddenGem: false,
      subScores: [
        { label: "전공 적합도", score: 90, weight: 0.25 },
        { label: "경험 적합도", score: 86, weight: 0.3 },
        { label: "기술 적합도", score: 88, weight: 0.3 },
        { label: "근무조건 적합도", score: 95, weight: 0.15 },
      ],
    },
    detail: {
      jobTitle: "SCM 운영",
      companyName: "울산 A기업",
      reasonSummary: "물류 인턴 과정에서 수행한 재고관리 경험과 SQL 분석 역량이 자재 흐름과 물류 데이터를 관리하는 업무에 직접 연결됩니다. 산업공학 전공에서 학습한 생산관리 지식도 직무 수행에 도움이 됩니다.",
      strengths: [
        { label: "SQL 데이터 분석", sourceContext: "물류 인턴 경험", relatedTo: "재고관리 및 물류 데이터 분석 업무" },
        { label: "생산관리 지식", sourceContext: "산업공학 전공", relatedTo: "자재 흐름과 공급망 운영" },
      ],
      gaps: [{ label: "SAP ERP 사용 경험", suggestion: "지역 교육프로그램에서 보완할 수 있어요." }],
    },
  },
  {
    result: {
      jobId: "job-production",
      jobTitle: "생산관리 직무",
      companyName: "태화 스마트팩토리",
      employmentType: "정규직",
      isHiddenGem: true,
      subScores: [
        { label: "전공 적합도", score: 95, weight: 0.25 },
        { label: "경험 적합도", score: 87, weight: 0.3 },
        { label: "기술 적합도", score: 92, weight: 0.3 },
        { label: "근무조건 적합도", score: 90, weight: 0.15 },
      ],
    },
    detail: {
      jobTitle: "생산관리 직무",
      companyName: "태화 스마트팩토리",
      reasonSummary: "평소 물류관리 공고를 주로 찾았지만, 이 생산관리 공고의 실제 업무에는 재고관리와 공정 데이터 분석이 포함되어 있습니다. 보유한 Excel·SQL 역량과 물류 경험을 다른 직무명으로 확장할 수 있는 기회입니다.",
      strengths: [
        { label: "재고관리 경험", sourceContext: "물류 인턴 경험", relatedTo: "생산계획에 따른 자재 및 재고 운영" },
        { label: "Excel·SQL", sourceContext: "데이터 분석 프로젝트", relatedTo: "공정 데이터 집계와 개선 지표 관리" },
      ],
      gaps: [{ label: "생산계획 시스템 경험", suggestion: "울산 제조 DX 교육과정에서 기초를 보완할 수 있어요." }],
      isHiddenGem: true,
      hiddenGemNote: "검색하던 ‘물류관리’와 직무명은 다르지만, 실제 업무에 재고관리와 데이터 분석이 포함되어 있어 높은 연관성을 보입니다.",
    },
  },
  {
    result: {
      jobId: "job-facility",
      jobTitle: "설비보전 엔지니어",
      companyName: "울산 모빌리티테크",
      employmentType: "정규직",
      isHiddenGem: true,
      subScores: [
        { label: "전공 적합도", score: 82, weight: 0.25 },
        { label: "경험 적합도", score: 76, weight: 0.3 },
        { label: "기술 적합도", score: 84, weight: 0.3 },
        { label: "근무조건 적합도", score: 95, weight: 0.15 },
      ],
    },
    detail: {
      jobTitle: "설비보전 엔지니어",
      companyName: "울산 모빌리티테크",
      reasonSummary: "센서 기반 자동제어 프로젝트 경험이 생산설비 점검과 예방보전 업무에 연결됩니다. 설비 직무를 직접 검색하지 않았더라도 기술 역량을 활용할 수 있습니다.",
      strengths: [
        { label: "센서 제어", sourceContext: "자동제어 프로젝트", relatedTo: "설비 센서 점검과 이상 모니터링" },
      ],
      gaps: [{ label: "산업안전 기초", suggestion: "안전보건공단 온라인 교육을 확인해 보세요." }],
      isHiddenGem: true,
      hiddenGemNote: "자동화 키워드로만 찾던 경험을 설비보전의 실제 업무까지 확장해 발견한 공고입니다.",
    },
  },
];

export function CareerMatchDemo() {
  const [step, setStep] = useState<DemoStep>("profile");
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const results = useMemo<MatchResultListItem[]>(
    () => demoJobs.map(({ result }) => ({
      ...result,
      onShowReason: () => {
        setSelectedJobId(result.jobId);
        setStep("detail");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    })),
    [],
  );

  const selectedJob = demoJobs.find(({ result }) => result.jobId === selectedJobId);

  function submitProfile(data: ProfileFormData) {
    setProfile(data);
    setStep("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (step === "profile") {
    return <ProfileInputForm onSubmit={submitProfile} />;
  }

  if (step === "detail" && selectedJob) {
    return (
      <div className="w-full max-w-sm">
        <BackButton onClick={() => setStep("results")}>매칭 목록으로</BackButton>
        <div className="mt-4">
          <MatchReasonDetail
            {...selectedJob.detail}
            onFindTraining={() => window.alert("울산 지역 역량 보완 교육 목록을 연결합니다.")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{profile?.major || "입력한 프로필"} 기반</p>
          <h2 className="mt-1 text-xl font-medium text-neutral-950 dark:text-white">매칭 결과 {results.length}개</h2>
        </div>
        <button type="button" onClick={() => setStep("profile")} className="text-xs font-medium text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400">
          프로필 다시 입력
        </button>
      </div>
      <MatchResultList results={results} />
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white">
      <ArrowLeft aria-hidden="true" size={15} />
      {children}
    </button>
  );
}
