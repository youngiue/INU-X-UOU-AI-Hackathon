"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileInputForm, type ProfileFormData } from "@/components/profile/ProfileInputForm";
import { useMatch } from "@/lib/context/MatchContext";
import type { UserProfile } from "@/lib/types";

function toUserProfile(formData: ProfileFormData): UserProfile {
  const careerExperiences = formData.career.trim() ? [formData.career.trim()] : [];
  const projectExperiences = formData.experience.trim() ? [formData.experience.trim()] : [];
  const experience = [...careerExperiences, ...projectExperiences].join("\n") || "입력된 경험 없음";

  return {
    major: formData.major,
    education: formData.education,
    careerExperiences,
    internshipExperiences: [],
    projectExperiences,
    certificates: formData.certificates,
    skills: formData.skills,
    trainingExperiences: [],
    preferredConditions: formData.employmentType === "무관" ? "" : formData.employmentType,
    interestedIndustries: [],
    usualSearchKeywords: formData.usualSearchKeywords,
    experience,
    preferredLocation: `울산 ${formData.district}`,
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { setMatchResult } = useMatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: ProfileFormData) {
    setLoading(true);
    setError("");
    const profile = toUserProfile(formData);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "분석에 실패했습니다.");
      setMatchResult(profile, payload);
      router.push("/results");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "알 수 없는 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[480px]">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink">
          <ArrowLeft aria-hidden="true" size={15} strokeWidth={2} />
          처음으로
        </Link>

        <p className="mt-6 font-technical text-xs tracking-[0.2em] text-accent2">PROFILE INPUT</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">내 역량 도면 작성</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          입력한 정보는 울산 지역 공고와의 적합도를 계산하는 데만 사용됩니다.
        </p>

        <div className="mt-8">
          <ProfileInputForm onSubmit={handleSubmit} submitting={loading} />
          {error && (
            <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
