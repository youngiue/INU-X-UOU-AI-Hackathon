"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MatchResultList, type MatchResultListItem } from "@/components/results/MatchResultList";
import { useMatch } from "@/lib/context/MatchContext";

export default function ResultsPage() {
  const router = useRouter();
  const { result, profile, isHydrated } = useMatch();

  if (!isHydrated) return null;

  if (!result || !profile) {
    return (
      <main className="min-h-screen px-6 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-[480px] text-center">
          <p className="font-technical text-xs tracking-[0.2em] text-accent2">NO DATA</p>
          <h1 className="mt-3 text-xl font-semibold text-ink">아직 분석된 결과가 없어요</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted">먼저 프로필을 입력하고 공고를 분석해 주세요.</p>
          <Link
            href="/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-hover"
          >
            프로필 입력하러 가기
          </Link>
        </div>
      </main>
    );
  }

  const listResults: MatchResultListItem[] = result.matches.map((match) => ({
    jobId: match.job.id,
    jobTitle: match.job.title,
    companyName: match.job.company,
    employmentType: match.job.employmentType,
    subScores: match.subScores,
    isHiddenGem: match.isHiddenGem,
    onShowReason: () => router.push(`/results/${match.job.id}`),
  }));

  return (
    <main className="min-h-screen px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[480px]">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink">
          <ArrowLeft aria-hidden="true" size={15} strokeWidth={2} />
          프로필 다시 입력
        </Link>

        <p className="mt-6 font-technical text-xs tracking-[0.2em] text-accent2">MATCH RESULT</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">매칭 결과 {result.matches.length}건</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          {result.aiEnhanced ? "AI 설명이 적용된 결과입니다." : "기본 분석 모드로 계산된 결과입니다."}
        </p>

        <div className="mt-8">
          <MatchResultList results={listResults} />
        </div>
      </div>
    </main>
  );
}
