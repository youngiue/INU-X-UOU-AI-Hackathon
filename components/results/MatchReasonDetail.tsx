"use client";

import { ArrowRight, Lightbulb, Search } from "lucide-react";
import type { JobMatch } from "@/lib/types";

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
  /** What the user usually searches by (keyword or major) — shown as a chip explaining the blind spot. */
  blindSpotLabel?: string;
  onFindTraining?: () => void;
  aiExplanation?: JobMatch["aiExplanation"];
  whatIfContent?: React.ReactNode;
}

export function MatchReasonDetail({
  jobTitle,
  companyName,
  reasonSummary,
  strengths,
  gaps,
  isHiddenGem = false,
  hiddenGemNote,
  blindSpotLabel,
  onFindTraining,
  aiExplanation,
  whatIfContent,
}: MatchReasonDetailProps) {
  return (
    <article className="w-full max-w-sm rounded-lg border border-grid bg-panel p-5 text-ink">
      {isHiddenGem && (
        <div className="mb-5 rounded-lg border border-accent2/40 bg-accent2-soft p-4">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-accent2">
            <Lightbulb aria-hidden="true" size={15} strokeWidth={2} />
            내가 놓치고 있던 직무
          </div>
          {blindSpotLabel && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-navy-900/40 px-2 py-1 text-[11px] font-medium text-accent2">
              <Search aria-hidden="true" size={11} strokeWidth={2} />
              평소 검색: &apos;{blindSpotLabel}&apos;
            </span>
          )}
          {hiddenGemNote && <p className="mt-2 text-xs leading-5 text-accent2/80">{hiddenGemNote}</p>}
        </div>
      )}

      <header>
        <h2 className="text-lg font-medium text-ink">{jobTitle}</h2>
        <p className="mt-1 text-[13px] text-muted">{companyName}</p>
        <p className="mt-4 text-[13px] leading-6 text-ink/90">{reasonSummary}</p>
      </header>

      {aiExplanation && (
        <div className="mt-6 space-y-5 border-t border-grid pt-5">
          <ExplanationSection title="추천한 이유" items={aiExplanation.recommendationReasons} />
          <ExplanationSection title="내 프로필과의 연결" items={aiExplanation.profileConnections} />
          <ExplanationSection title="보완하면 좋은 점" items={[...aiExplanation.missingConditions, ...aiExplanation.improvementSuggestions]} />
          <ExplanationSection title="새로운 직무 연결" items={aiExplanation.unexpectedConnections} />
          {aiExplanation.similarRoles.length > 0 && (
            <section><h3 className="text-sm font-medium text-ink">함께 살펴볼 직무</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted">{aiExplanation.similarRoles.map(({ role, reason }) => <li key={`${role}-${reason}`}><strong className="text-ink">{role}</strong> — {reason}</li>)}</ul></section>
          )}
        </div>
      )}

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
      {whatIfContent}

      {gaps.length > 0 && (
        <button
          type="button"
          onClick={onFindTraining}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-3 text-[13px] font-semibold text-navy-950 transition active:scale-95 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent2"
        >
          역량 보완 교육 보기
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      )}
    </article>
  );
}

function ExplanationSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <section><h3 className="text-sm font-medium text-ink">{title}</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}
