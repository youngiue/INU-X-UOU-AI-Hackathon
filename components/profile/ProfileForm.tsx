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

export function ProfileForm({ onSubmit, loading }: Props) {
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
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

  return (
    <form className="profile-card" onSubmit={submit}>
      <div>
        <p className="section-kicker">Career Profile</p>
        <h2 className="section-title">나의 프로필 입력하기</h2>
        <p className="section-description">현재 가진 경험과 역량을 항목별로 입력하면 울산의 숨은 직무를 찾아드립니다.</p>
      </div>

      <div className="privacy-notice" role="note">
        <strong>개인정보 입력 금지</strong>
        <span>실명, 이메일, 전화번호, 주소, 생년월일, 주민등록번호는 입력하지 마세요.</span>
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
        {loading ? "울산의 기회를 분석하는 중…" : "숨은 직무 발견하기 →"}
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
