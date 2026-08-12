"use client";

import { useState, type FormEvent } from "react";
import type { UserProfile } from "@/lib/types";

interface Props {
  onSubmit: (profile: UserProfile) => Promise<void>;
  loading: boolean;
}

interface ProfileDraft {
  major: string;
  education: string;
  careerExperiences: string;
  internshipExperiences: string;
  projectExperiences: string;
  certificates: string;
  skills: string;
  trainingExperiences: string;
  preferredConditions: string;
  preferredLocation: string;
  interestedIndustries: string;
}

const emptyDraft: ProfileDraft = {
  major: "",
  education: "",
  careerExperiences: "",
  internshipExperiences: "",
  projectExperiences: "",
  certificates: "",
  skills: "",
  trainingExperiences: "",
  preferredConditions: "",
  preferredLocation: "울산",
  interestedIndustries: "",
};

function lines(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function toDraft(profile: Record<string, unknown>): ProfileDraft {
  const arrayValue = (key: string) => Array.isArray(profile[key]) ? (profile[key] as string[]).join("\n") : "";
  const stringValue = (key: string) => typeof profile[key] === "string" ? String(profile[key]) : "";
  return {
    major: stringValue("major"),
    education: stringValue("education"),
    careerExperiences: arrayValue("careerExperiences"),
    internshipExperiences: arrayValue("internshipExperiences"),
    projectExperiences: arrayValue("projectExperiences"),
    certificates: arrayValue("certificates"),
    skills: arrayValue("skills"),
    trainingExperiences: arrayValue("trainingExperiences"),
    preferredConditions: stringValue("preferredConditions"),
    preferredLocation: stringValue("preferredLocation") || "울산",
    interestedIndustries: arrayValue("interestedIndustries"),
  };
}

export function ProfileForm({ onSubmit, loading }: Props) {
  const [profileText, setProfileText] = useState("");
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnalysisError("");
    setAnalyzing(true);

    try {
      const body = new FormData();
      body.append("profileText", profileText);

      const response = await fetch("/api/profile/analyze", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "프로필 분석에 실패했습니다.");
      setDraft(toDraft(payload.profile));
      setAnalyzed(true);
    } catch (cause) {
      setAnalysisError(cause instanceof Error ? cause.message : "프로필 분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const careerExperiences = lines(draft.careerExperiences);
    const internshipExperiences = lines(draft.internshipExperiences);
    const projectExperiences = lines(draft.projectExperiences);
    const trainingExperiences = lines(draft.trainingExperiences);
    const experience = [
      ...careerExperiences,
      ...internshipExperiences,
      ...projectExperiences,
      ...trainingExperiences,
    ].join("\n") || "입력된 세부 경험 없음";

    void onSubmit({
      major: draft.major,
      education: draft.education,
      careerExperiences,
      internshipExperiences,
      projectExperiences,
      certificates: lines(draft.certificates),
      skills: lines(draft.skills),
      trainingExperiences,
      preferredConditions: draft.preferredConditions,
      preferredLocation: draft.preferredLocation,
      interestedIndustries: lines(draft.interestedIndustries),
      experience,
    });
  }

  if (!analyzed) {
    return (
      <form className="profile-card" onSubmit={analyze}>
        <p className="section-kicker">Step 1 · AI Profile Analysis</p>
        <h2 className="section-title">AI에게 나를 알려주세요</h2>
        <p className="section-description">이력서에서 실명과 연락처 등 개인정보를 제거한 뒤, 경력 관련 내용만 아래에 붙여 넣어주세요.</p>

        <div className="privacy-notice" role="note">
          <strong>개인정보 입력 금지</strong>
          <span>실명, 이메일, 전화번호, 주소, 생년월일, 주민등록번호는 입력하지 마세요. 입력 내용은 AI 분석 API로 전송됩니다.</span>
        </div>

        <div className="field profile-story">
          <label htmlFor="profileText">간단한 프로필 설문</label>
          <textarea
            id="profileText"
            value={profileText}
            onChange={(event) => setProfileText(event.target.value)}
            placeholder={`예: 울산 소재 대학 산업공학 전공 재학 중입니다. 물류 인턴 과정에서 재고관리를 담당했고 SQL 프로젝트를 수행했습니다.\n\n※ 실명, 학교명, 연락처처럼 개인을 식별할 수 있는 정보는 제외해 주세요.`}
          />
          <span className="hint">정해진 양식 없이 문장으로 작성해도 AI가 항목별로 정리합니다.</span>
        </div>

        <label className="privacy-check">
          <input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} />
          <span>실명·연락처 등 개인정보를 제거했음을 확인했습니다.</span>
        </label>

        {analysisError && <p className="error" role="alert">{analysisError}</p>}
        <button className="submit" type="submit" disabled={analyzing || !profileText.trim() || !privacyConfirmed}>
          {analyzing ? "AI가 경험을 분석하는 중…" : "AI 프로필 분석하기 →"}
        </button>
      </form>
    );
  }

  return (
    <form className="profile-card" onSubmit={submit}>
      <div className="form-heading-row">
        <div>
          <p className="section-kicker">Step 2 · Review</p>
          <h2 className="section-title">AI가 분석한 내 프로필</h2>
          <p className="section-description">잘못 추출되거나 빠진 내용은 직접 수정한 후 매칭을 시작하세요.</p>
        </div>
        <button className="text-button" type="button" onClick={() => setAnalyzed(false)}>다시 입력하기</button>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="major">전공</label>
          <input id="major" value={draft.major} onChange={(event) => update("major", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="education">학력</label>
          <input id="education" value={draft.education} onChange={(event) => update("education", event.target.value)} placeholder="예: 울산대학교 산업공학과 재학" />
        </div>
        <ListField id="career" label="경력" value={draft.careerExperiences} onChange={(value) => update("careerExperiences", value)} />
        <ListField id="internship" label="인턴 경험" value={draft.internshipExperiences} onChange={(value) => update("internshipExperiences", value)} />
        <ListField id="projects" label="프로젝트 경험" value={draft.projectExperiences} onChange={(value) => update("projectExperiences", value)} />
        <ListField id="certificates" label="자격증" value={draft.certificates} onChange={(value) => update("certificates", value)} />
        <ListField id="skills" label="기술 및 툴" value={draft.skills} onChange={(value) => update("skills", value)} required />
        <ListField id="training" label="교육 경험" value={draft.trainingExperiences} onChange={(value) => update("trainingExperiences", value)} />
        <div className="field full">
          <label htmlFor="conditions">희망 근무조건</label>
          <textarea id="conditions" value={draft.preferredConditions} onChange={(event) => update("preferredConditions", event.target.value)} placeholder="예: 울산 근무, 정규직 희망" />
        </div>
        <div className="field">
          <label htmlFor="location">희망 근무지역</label>
          <input id="location" value={draft.preferredLocation} onChange={(event) => update("preferredLocation", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="industries">관심 산업</label>
          <input id="industries" value={draft.interestedIndustries} onChange={(event) => update("interestedIndustries", event.target.value)} placeholder="자동차, 조선, 에너지" />
        </div>
      </div>

      <button className="submit" type="submit" disabled={loading}>
        {loading ? "울산의 기회를 분석하는 중…" : "확인 완료 · 숨은 직무 발견하기 →"}
      </button>
    </form>
  );
}

function ListField({ id, label, value, onChange, required = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="field full">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="여러 항목은 줄바꿈으로 구분해 주세요." required={required} />
    </div>
  );
}
