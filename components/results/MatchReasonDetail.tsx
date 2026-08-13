"use client";

import { ArrowRight, Lightbulb } from "lucide-react";

export interface SkillMatch {
  label: string;
  sourceContext: string;
  relatedTo: string;
}

export interface SkillGap {
  label: string;
  suggestion?: string;
}

export interface MatchReasonDetailProps {
  jobTitle: string;
  companyName: string;
  reasonSummary: string;
  strengths: SkillMatch[];
  gaps: SkillGap[];
  isHiddenGem?: boolean;
  hiddenGemNote?: string;
  onFindTraining?: () => void;
}

export function MatchReasonDetail({
  jobTitle,
  companyName,
  reasonSummary,
  strengths,
  gaps,
  isHiddenGem = false,
  hiddenGemNote,
  onFindTraining,
}: MatchReasonDetailProps) {
  return (
    <article className="w-full max-w-sm rounded-lg border border-grid bg-panel p-5 text-ink">
      {isHiddenGem && (
        <div className="mb-5 rounded-lg border border-accent2/40 bg-accent2-soft p-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-accent2">
            <Lightbulb aria-hidden="true" size={15} strokeWidth={2} />
            내가 놓치고 있던 직무
          </div>
          {hiddenGemNote && <p className="mt-2 text-xs leading-5 text-accent2/80">{hiddenGemNote}</p>}
        </div>
      )}

      <header>
        <h2 className="text-lg font-medium text-ink">{jobTitle}</h2>
        <p className="mt-1 text-[13px] text-muted">{companyName}</p>
        <p className="mt-4 text-[13px] leading-6 text-ink/90">{reasonSummary}</p>
      </header>

      <section className="mt-6">
        <h3 className="text-sm font-medium text-ink">연관 강점</h3>
        <div className="mt-3 space-y-3">
          {strengths.map((strength, index) => (
            <div key={`${strength.label}-${index}`} className="rounded-lg border border-success/30 bg-success-soft p-4">
              <strong className="text-[13px] font-medium text-success">{strength.label}</strong>
              <p className="mt-1.5 text-xs leading-5 text-success/80">
                {strength.sourceContext} → {strength.relatedTo}
              </p>
            </div>
          ))}
        </div>
      </section>

      {gaps.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-medium text-ink">보완이 필요한 부분</h3>
          <div className="mt-3 space-y-3">
            {gaps.map((gap, index) => (
              <div key={`${gap.label}-${index}`} className="rounded-lg border border-accent/30 bg-accent-soft p-4">
                <strong className="text-[13px] font-medium text-accent">{gap.label}</strong>
                {gap.suggestion && <p className="mt-1.5 text-xs leading-5 text-accent/80">{gap.suggestion}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {gaps.length > 0 && (
        <button
          type="button"
          onClick={onFindTraining}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-3 text-[13px] font-semibold text-navy-950 transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent2"
        >
          역량 보완 교육 보기
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      )}
    </article>
  );
}
