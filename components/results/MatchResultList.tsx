"use client";

import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { MatchResultCard, type MatchResultCardProps } from "./MatchResultCard";

export type MatchResultListItem = MatchResultCardProps & { jobId: string };

export interface MatchResultListProps {
  results: MatchResultListItem[];
  /** What the user usually searches by (keyword or major) — shown in the discovery tab's intro. */
  blindSpotLabel?: string;
}

type ResultGroup = "existing" | "hidden";

function groupByDiscoveryType(results: MatchResultListItem[]) {
  return results.reduce(
    (groups, result) => {
      groups[result.isHiddenGem === true ? "hidden" : "existing"].push(result);
      return groups;
    },
    { existing: [] as MatchResultListItem[], hidden: [] as MatchResultListItem[] },
  );
}

export function MatchResultList({ results, blindSpotLabel }: MatchResultListProps) {
  const groupedResults = useMemo(() => groupByDiscoveryType(results), [results]);
  const [activeGroup, setActiveGroup] = useState<ResultGroup>(
    groupedResults.existing.length > 0 ? "existing" : "hidden",
  );
  const visibleResults = groupedResults[activeGroup];

  return (
    <section className="w-full">
      <div className="relative grid grid-cols-2 border-b border-grid" role="tablist" aria-label="매칭 결과 분류">
        <TabButton
          active={activeGroup === "existing"}
          onClick={() => setActiveGroup("existing")}
          count={groupedResults.existing.length}
          id="existing-results-tab"
          controls="existing-results-panel"
        >
          기존 검색 직무
        </TabButton>
        <TabButton
          active={activeGroup === "hidden"}
          onClick={() => setActiveGroup("hidden")}
          count={groupedResults.hidden.length}
          id="hidden-results-tab"
          controls="hidden-results-panel"
          accent
        >
          <Lightbulb aria-hidden="true" size={14} strokeWidth={2} />
          <span>새로 발견된 직무</span>
        </TabButton>
        <div
          aria-hidden="true"
          className={`absolute bottom-0 left-0 h-0.5 w-1/2 rounded-full transition-transform duration-300 ease-out ${
            activeGroup === "hidden" ? "translate-x-full bg-accent2" : "translate-x-0 bg-success"
          }`}
        />
      </div>

      <div
        id={`${activeGroup}-results-panel`}
        role="tabpanel"
        aria-labelledby={`${activeGroup}-results-tab`}
        className="mt-4"
      >
        {activeGroup === "hidden" && (
          <div className="mb-4 rounded-lg border border-accent2/40 bg-accent2-soft p-4 text-center text-[13px] leading-5 text-accent2">
            {blindSpotLabel ? (
              <>
                평소 <strong className="font-semibold">&apos;{blindSpotLabel}&apos;</strong> 위주로 검색하셨네요.
                <br />그 사각지대에 있던 직무들이에요.
              </>
            ) : (
              "평소 검색하지 않았던 직무지만, 회원님의 역량과 연관성이 높은 공고예요."
            )}
          </div>
        )}

        {visibleResults.length > 0 ? (
          <div className="flex flex-col gap-4">
            {visibleResults.map((result) => (
              <MatchResultCard key={result.jobId} {...result} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-grid bg-navy-800 px-5 py-12 text-center text-[13px] leading-5 text-muted">
            {activeGroup === "existing" ? (
              <>
                평소 검색어와 그대로 겹치는 공고는 없었어요.
                <br />
                대신 실제 업무 기준으로 연결되는 직무를{" "}
                <strong className="font-medium text-ink">&apos;새로 발견된 직무&apos;</strong>
                {" "}탭에서 확인해 보세요.
              </>
            ) : (
              "조건에 맞는 공고가 아직 없어요."
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  count,
  id,
  controls,
  accent = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  id: string;
  controls: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const activeColor = accent ? "text-accent2" : "text-success";

  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center gap-1.5 px-2 text-xs font-medium transition active:scale-95 ${
        active ? activeColor : "text-muted hover:text-ink"
      }`}
    >
      {children}
      <span
        className={`rounded-full px-1.5 py-0.5 font-technical text-[11px] ${
          active && accent
            ? "bg-accent2-soft text-accent2"
            : active
              ? "bg-success-soft text-success"
              : "bg-navy-800 text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
