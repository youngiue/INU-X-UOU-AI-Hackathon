"use client";

import { useState } from "react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MatchResults } from "@/components/results/MatchResults";
import type { MatchResponse, UserProfile } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(nextProfile: UserProfile) {
    setLoading(true);
    setError("");
    setProfile(nextProfile);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "분석에 실패했습니다.");
      setResult(payload);
      window.setTimeout(() => document.querySelector("#results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="nav"><span className="brand-mark">U</span><strong>울산 커리어 레이더</strong><span className="badge">AI Hackathon</span></div>
        <div className="hero-copy">
          <p className="eyebrow">직무명 너머의 가능성을 찾습니다</p>
          <h1>내 경험이 연결되는<br /><em>울산의 숨은 직무</em></h1>
          <p>전공과 기술, 프로젝트 경험을 입력하면 채용공고의 실제 업무를 분석해 생각하지 못했던 기회를 보여드립니다.</p>
        </div>
      </section>

      <section className="workspace">
        <ProfileForm onSubmit={analyze} loading={loading} />
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {result && profile && <MatchResults initialResult={result} profile={profile} />}
    </main>
  );
}
