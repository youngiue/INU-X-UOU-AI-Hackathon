"use client";

import { useState, type FormEvent } from "react";
import type { UserProfile } from "@/lib/types";

interface Props {
  onSubmit: (profile: UserProfile) => Promise<void>;
  loading: boolean;
}

export function ProfileForm({ onSubmit, loading }: Props) {
  const [major, setMajor] = useState("전기전자공학");
  const [skills, setSkills] = useState("PLC, 센서, Excel");
  const [experience, setExperience] = useState("아두이노와 센서를 이용해 자동제어 프로젝트를 진행했습니다.");
  const [preferredLocation, setPreferredLocation] = useState("울산");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit({
      major,
      skills: skills.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean),
      experience,
      preferredLocation,
    });
  }

  return (
    <form className="profile-card" onSubmit={submit}>
      <p className="section-kicker">Career Profile</p>
      <h2 className="section-title">나의 가능성 입력하기</h2>
      <p className="section-description">희망 직무를 몰라도 괜찮습니다. 지금 가진 것만 알려주세요.</p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="major">전공</label>
          <input id="major" value={major} onChange={(event) => setMajor(event.target.value)} placeholder="예: 전기전자공학" required />
        </div>
        <div className="field">
          <label htmlFor="location">희망 근무지역</label>
          <input id="location" value={preferredLocation} onChange={(event) => setPreferredLocation(event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="skills">보유 기술</label>
          <input id="skills" value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="PLC, Excel, SQL처럼 쉼표로 구분" required />
          <span className="hint">쉼표로 구분해 여러 기술을 입력하세요.</span>
        </div>
        <div className="field full">
          <label htmlFor="experience">프로젝트·인턴·활동 경험</label>
          <textarea id="experience" value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="무엇을 만들거나 개선했는지 적어주세요." required />
        </div>
      </div>

      <button className="submit" type="submit" disabled={loading}>{loading ? "울산의 기회를 분석하는 중…" : "숨은 직무 발견하기 →"}</button>
    </form>
  );
}
