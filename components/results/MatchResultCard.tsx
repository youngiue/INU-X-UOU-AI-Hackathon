"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Lightbulb, Search } from "lucide-react";

export interface SubScore {
  label: string;
  score: number;
  weight: number;
}

export interface MatchResultCardProps {
  jobTitle: string;
  companyName: string;
  employmentType: string;
  subScores: SubScore[];
  isHiddenGem?: boolean;
  /** What the user usually searches by (keyword or major) — shown as the reason this job was a blind spot. */
  blindSpotLabel?: string;
  onShowReason?: () => void;
}

const GAUGE_RADIUS = 46;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function clampScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

function getGaugeColorClass(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-accent";
  return "text-muted-dim";
}

function ScoreBar({ item }: { item: SubScore }) {
  const score = clampScore(item.score);
  const weightPercentage = Math.round(item.weight * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate font-medium text-ink">{item.label}</span>
        <span className="shrink-0 font-technical text-[11px] text-muted">
          {score} · {weightPercentage}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-navy-800"
        role="progressbar"
        aria-label={`${item.label} ${score}점`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-700 ease-out"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function MatchResultCard({
  jobTitle,
  companyName,
  employmentType,
  subScores,
  isHiddenGem = false,
  blindSpotLabel,
  onShowReason,
}: MatchResultCardProps) {
  const overallScore = useMemo(
    () => Math.round(subScores.reduce((sum, item) => sum + item.score * item.weight, 0)),
    [subScores],
  );
  const safeOverallScore = clampScore(overallScore);
  const [isGaugeAnimated, setIsGaugeAnimated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsGaugeAnimated(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const gaugeOffset = GAUGE_CIRCUMFERENCE * (1 - (isGaugeAnimated ? safeOverallScore : 0) / 100);
  const formula = `${subScores
    .map((item) => `${item.score}×${Math.round(item.weight * 100)}%`)
    .join(" + ")} = ${overallScore}%`;

  return (
    <article className="w-full max-w-sm rounded-lg border border-grid bg-panel p-5 text-ink">
      <header className="flex min-h-11 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-ink">{jobTitle}</h3>
          <p className="mt-1 truncate text-[13px] text-muted">
            {companyName} · {employmentType}
          </p>
        </div>
        {isHiddenGem && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent2/40 bg-accent2-soft px-2.5 py-1 text-xs font-medium text-accent2">
            <Lightbulb aria-hidden="true" size={13} strokeWidth={2} />
            놓치고 있던 직무
          </span>
        )}
      </header>

      {isHiddenGem && blindSpotLabel && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-accent2">
          <Search aria-hidden="true" size={12} strokeWidth={2} className="shrink-0" />
          <span>
            평소 <strong className="font-medium">&apos;{blindSpotLabel}&apos;</strong> 검색만으론 놓치기 쉬운 직무예요
          </span>
        </p>
      )}

      <div className="mt-5 grid grid-cols-[124px_minmax(0,1fr)] items-center gap-4">
        <div className="relative mx-auto h-28 w-28" aria-label={`종합 매칭률 ${overallScore}%`}>
          <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
            <circle
              className="stroke-navy-800"
              cx="56"
              cy="56"
              r={GAUGE_RADIUS}
              fill="none"
              strokeWidth="9"
            />
            <circle
              className={`${getGaugeColorClass(safeOverallScore)} stroke-current transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none`}
              cx="56"
              cy="56"
              r={GAUGE_RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={GAUGE_CIRCUMFERENCE}
              strokeDashoffset={gaugeOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <strong className="font-technical text-2xl font-semibold tracking-tight text-ink">{overallScore}%</strong>
            <span className="mt-0.5 text-xs text-muted">매칭률</span>
          </div>
        </div>

        <div className="space-y-4">
          {subScores.slice(0, 2).map((item, index) => (
            <ScoreBar key={`${item.label}-${index}`} item={item} />
          ))}
        </div>
      </div>

      {subScores.length > 2 && (
        <div className="mt-5 space-y-4 border-t border-grid pt-5">
          {subScores.slice(2).map((item, index) => (
            <ScoreBar key={`${item.label}-${index + 2}`} item={item} />
          ))}
        </div>
      )}

      <p className="mt-5 text-left font-technical text-[11px] leading-5 text-muted-dim">{formula}</p>

      <button
        type="button"
        onClick={onShowReason}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-3 text-[13px] font-semibold text-navy-950 transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent2"
      >
        추천 이유 보기
        <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
      </button>
    </article>
  );
}
