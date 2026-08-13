"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { MatchReasonDetail } from "@/components/results/MatchReasonDetail";
import { useMatch } from "@/lib/context/MatchContext";
import { calculateMatch } from "@/lib/matching/calculate";
import { createScoreChangeExplanation } from "@/lib/matching/score-change-explanation";
import { formatRequirement } from "@/lib/matching/display";
import type { JobMatch } from "@/lib/types";

export default function ResultDetailPage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const { result, profile, isHydrated } = useMatch();
  const [boostedMatch, setBoostedMatch] = useState<JobMatch | null>(null);

  if (!isHydrated) return null;

  const match = result?.matches.find((item) => item.job.id === params.jobId);
  const usualSearchKeywords = profile?.usualSearchKeywords ?? [];
  const blindSpotLabel = profile ? (usualSearchKeywords.length > 0 ? usualSearchKeywords.join(", ") : profile.major) : undefined;

  if (!match) {
    return (
      <main className="min-h-screen px-6 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-[480px] text-center">
          <p className="font-technical text-xs tracking-[0.2em] text-accent2">NOT FOUND</p>
          <h1 className="mt-3 text-xl font-semibold text-ink">결과를 찾을 수 없어요</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted">세션이 만료되었거나 잘못된 접근입니다.</p>
          <Link
            href="/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-navy-950 transition active:scale-95 hover:bg-accent-hover"
          >
            프로필 입력하러 가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[480px]">
        <button
          type="button"
          onClick={() => router.push("/results")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition active:scale-95 hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" size={15} strokeWidth={2} />
          목록으로
        </button>

        <div className="mt-6">
          <MatchReasonDetail
            jobTitle={match.job.title}
            companyName={match.job.company}
            reasonSummary={match.reasonSummary}
            strengths={match.strengths}
            gaps={match.gaps}
            isHiddenGem={match.isHiddenGem}
            hiddenGemNote={match.hiddenGemNote}
            blindSpotLabel={blindSpotLabel}
            aiExplanation={match.aiExplanation}
            welfareServices={match.welfareServices}
            whatIfContent={profile && match.missingSkills[0] ? (
              <section className="mt-6 border-t border-grid pt-5">
                <button type="button" onClick={() => setBoostedMatch(calculateMatch({ ...profile, skills: [...profile.skills, match.missingSkills[0]] }, match.job))} className="w-full rounded-md border border-accent px-4 py-3 text-[13px] font-semibold text-accent">
                  {formatRequirement(match.missingSkills[0])} 역량을 보완하면
                </button>
                {boostedMatch && <div className="mt-3 rounded-lg border border-grid bg-navy-800 p-4 text-xs leading-5 text-muted"><p>{createScoreChangeExplanation(match.missingSkills[0], match, boostedMatch)}</p></div>}
              </section>
            ) : undefined}
          />
        </div>
      </div>
    </main>
  );
}
