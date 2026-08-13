"use client";

import { ExternalLink, Lightbulb, MapPin, Search } from "lucide-react";
import type { JobMatch, WelfareService } from "@/lib/types";

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
  /** 공고 원문 링크. 실제 채용 사이트로 이동해 지원·상세 조건을 확인하도록 함. */
  sourceUrl?: string;
  reasonSummary: string;
  strengths: SkillMatch[];
  gaps: SkillGap[];
  isHiddenGem?: boolean;
  hiddenGemNote?: string;
  /** What the user usually searches by (keyword or major) — shown as a chip explaining the blind spot. */
  blindSpotLabel?: string;
  aiExplanation?: JobMatch["aiExplanation"];
  whatIfContent?: React.ReactNode;
  /** 공고 근무지 기준으로 이용 가능성이 있는 울산 복지서비스 */
  welfareServices?: WelfareService[];
}

export function MatchReasonDetail({
  jobTitle,
  companyName,
  sourceUrl,
  reasonSummary,
  strengths,
  gaps,
  isHiddenGem = false,
  hiddenGemNote,
  blindSpotLabel,
  aiExplanation,
  whatIfContent,
  welfareServices = [],
}: MatchReasonDetailProps) {
  return (
    <article className="w-full rounded-lg border border-grid bg-panel p-5 text-ink">
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
        {sourceUrl && sourceUrl !== "#" && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent2 hover:underline"
          >
            공고 원문 보기
            <ExternalLink aria-hidden="true" size={12} strokeWidth={2} />
          </a>
        )}
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

      {welfareServices.length > 0 && (
        <section className="mt-6 border-t border-grid pt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <MapPin aria-hidden="true" size={14} strokeWidth={2} />
            울산 취업 시 확인할 수 있는 청년지원
          </h3>
          <div className="mt-3 space-y-3">
            {welfareServices.map((service) => (
              <div key={service.id} className="rounded-lg border border-grid bg-navy-800 p-4">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-[13px] font-medium text-ink">{service.title}</strong>
                  <span className="shrink-0 rounded-full bg-navy-900/60 px-2 py-0.5 text-[11px] font-medium text-accent2">{service.areaLabel}</span>
                </div>
                {service.supportSummary && <p className="mt-1 text-xs text-muted">{service.supportSummary}</p>}
                <p className="mt-1.5 text-xs leading-5 text-ink/80">{service.reason}</p>
                {service.conditions.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] leading-4 text-muted">
                    {service.conditions.map((condition) => <li key={condition}>{condition}</li>)}
                  </ul>
                )}
                {service.sourceUrl && (
                  <a href={service.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium text-accent2 hover:underline">
                    자세히 보기 ↗
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted">실제 신청 자격·지원 내용은 기관 공고 원문을 반드시 확인하세요.</p>
        </section>
      )}
    </article>
  );
}

function ExplanationSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <section><h3 className="text-sm font-medium text-ink">{title}</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}
