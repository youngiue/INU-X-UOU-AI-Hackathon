"use client";

import { useState } from "react";
import type { JobMatch, MatchResponse, UserProfile } from "@/lib/types";
import { calculateMatch } from "@/lib/matching/calculate";

interface Props {
  initialResult: MatchResponse;
  profile: UserProfile;
}

export function MatchResults({ initialResult, profile }: Props) {
  const [boosted, setBoosted] = useState<Record<string, JobMatch>>({});

  function simulate(match: JobMatch) {
    const skill = match.missingSkills[0];
    if (!skill) return;
    setBoosted((current) => ({
      ...current,
      [match.job.id]: calculateMatch({ ...profile, skills: [...profile.skills, skill] }, match.job),
    }));
  }

  return (
    <section className="results-section" id="results">
      <div className="results-head">
        <div>
          <p className="section-kicker">Hidden Opportunities</p>
          <h2 className="section-title">당신이 검색하지 않았던 TOP 3</h2>
          <p>점수는 합격 확률이 아닌 공고의 실제 업무와의 적합도입니다.</p>
        </div>
        <p className="ai-status">{initialResult.aiEnhanced ? "AI 설명 적용됨" : "안전한 기본 분석 모드"}</p>
      </div>

      <div className="verification-notice" role="note">
        <strong>AI 활용 및 검증 안내</strong>
        <span>AI는 입력된 프로필과 공고를 바탕으로 추천 이유를 설명하는 데 사용됩니다. 매칭 점수는 코드 기반 참고 지표이며 합격 확률이 아닙니다. 현재 공고는 기능 검증용 샘플이므로 실제 지원 전 원문과 출처를 반드시 확인하세요.</span>
      </div>

      <div className="result-grid">
        {initialResult.matches.map((match, index) => {
          const boostedMatch = boosted[match.job.id];
          const missingSkill = match.missingSkills[0];
          return (
            <article className="job-card" key={match.job.id}>
              <div className="card-top"><span className="rank">DISCOVERY {index + 1}</span><span className="score">{match.score}</span></div>
              <p className="company">{match.job.company} · {match.job.location}</p>
              <h3>{match.job.title}</h3>
              <p className="discovered">숨은 연결: {match.job.discoveredRole}</p>
              <p className="reason">{match.reasons[0]}</p>
              <div className="tag-row">
                {match.matchedSkills.map((skill) => <span className="tag" key={skill}>✓ {skill}</span>)}
                {missingSkill && <span className="tag missing">보완 {missingSkill}</span>}
              </div>
              <div className="what-if">
                {missingSkill ? (
                  <button type="button" onClick={() => simulate(match)}>{missingSkill}을 배운다면?</button>
                ) : <p className="boost">핵심 요구 기술을 모두 보유하고 있습니다.</p>}
                {boostedMatch && <p className="boost">업무 적합도 {match.score} → {boostedMatch.score}점</p>}
              </div>
              {match.job.sourceUrl !== "#" && <a className="source" href={match.job.sourceUrl} target="_blank" rel="noreferrer">공고 원문 보기 ↗</a>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
