"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { EMPLOYMENT_TYPES, ULSAN_DISTRICTS } from "@/lib/ulsan";
import { OptionSelect } from "./OptionSelect";
import { TagInput } from "./TagInput";

export interface ProfileFormData {
  major: string;
  education: string;
  career: string;
  internship: string;
  project: string;
  training: string;
  experience: string;
  certificates: string[];
  skills: string[];
  employmentType: string;
  districts: string[];
  usualSearchKeywords: string[];
  interestedIndustries: string[];
}

export interface ProfileInputFormProps {
  onSubmit: (data: ProfileFormData) => void | Promise<void>;
  submitting?: boolean;
}

const initialFormData: ProfileFormData = {
  major: "",
  education: "",
  career: "",
  internship: "",
  project: "",
  training: "",
  experience: "",
  certificates: [],
  skills: [],
  employmentType: "정규직",
  districts: [],
  usualSearchKeywords: [],
  interestedIndustries: [],
};

const inputClassName =
  "w-full rounded-md border border-grid bg-navy-800 px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-muted-dim focus:border-accent2 focus:ring-2 focus:ring-accent2/20";

export function ProfileInputForm({ onSubmit, submitting = false }: ProfileInputFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);

  function updateField<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formData.districts.length === 0) return;
    void onSubmit(formData);
  }

  return (
    <form className="w-full max-w-[480px] space-y-5" onSubmit={handleSubmit}>
      <FormSection title="기본정보" index="01">
        <TextField id="major" label="전공" value={formData.major} onChange={(value) => updateField("major", value)} placeholder="예: 산업공학" required />
        <TextField id="education" label="학력" value={formData.education} onChange={(value) => updateField("education", value)} placeholder="예: 대학교 재학" required />
      </FormSection>

      <FormSection title="경험" index="02">
        <TextAreaField id="career" label="경력" value={formData.career} onChange={(value) => updateField("career", value)} placeholder="담당 업무와 성과, 인턴 경험 등을 적어주세요." />
        <TextAreaField id="internship" label="인턴 경험" value={formData.internship} onChange={(value) => updateField("internship", value)} placeholder="인턴 근무처와 실제 담당 업무를 적어주세요." />
        <TextAreaField id="project" label="프로젝트 경험" value={formData.project} onChange={(value) => updateField("project", value)} placeholder="프로젝트명, 역할, 사용 기술을 적어주세요." />
        <TextAreaField id="training" label="교육 경험" value={formData.training} onChange={(value) => updateField("training", value)} placeholder="수료한 교육이나 훈련 과정을 적어주세요." />
        <TextAreaField id="experience" label="기타 경험" value={formData.experience} onChange={(value) => updateField("experience", value)} placeholder="위 항목에 포함되지 않은 관련 경험을 적어주세요." />
      </FormSection>

      <FormSection title="역량" index="03">
        <TagInput id="certificates" label="자격증" value={formData.certificates} onChange={(value) => updateField("certificates", value)} placeholder="예: 품질경영기사" />
        <TagInput id="skills" label="기술 및 툴" value={formData.skills} onChange={(value) => updateField("skills", value)} placeholder="예: SQL, Excel, PLC" />
      </FormSection>

      <FormSection title="근무조건" index="04">
        <OptionSelect
          id="employmentType"
          label="고용형태"
          options={EMPLOYMENT_TYPES}
          value={formData.employmentType}
          onChange={(value) => updateField("employmentType", value)}
          columns={4}
        />
        <OptionSelect
          id="district"
          label="희망 근무지역 (울산)"
          options={ULSAN_DISTRICTS}
          multiple
          value={formData.districts}
          onChange={(value) => updateField("districts", value)}
          columns={5}
          description="울산 내 희망 구/군을 선택해 주세요. (복수 선택 가능)"
        />
      </FormSection>

      <FormSection title="검색습관" index="05" accent>
        <TagInput id="interestedIndustries" label="관심 산업" value={formData.interestedIndustries} onChange={(value) => updateField("interestedIndustries", value)} placeholder="예: 제조업, 자동차, 에너지" />
        <TagInput
          id="usualSearchKeywords"
          label="평소 어떤 키워드로 채용정보를 검색하셨나요?"
          value={formData.usualSearchKeywords}
          onChange={(value) => updateField("usualSearchKeywords", value)}
          placeholder="예: PLC, 자동화, 전기설비"
          description="입력한 검색어와 다른 직무명 속에서 연결 가능한 업무를 찾아드려요."
        />
      </FormSection>

      <button
        type="submit"
        disabled={submitting || formData.districts.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "울산의 공고를 분석하는 중…" : "내 역량으로 공고 찾기"}
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    </form>
  );
}

function FormSection({
  title,
  index,
  accent = false,
  children,
}: {
  title: string;
  index: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`space-y-4 rounded-lg border p-5 ${accent ? "border-accent2/40 bg-accent2-soft" : "border-grid bg-panel"}`}>
      <h2 className="flex items-center gap-2 text-base font-medium text-ink">
        <span className={`font-technical text-xs ${accent ? "text-accent2" : "text-muted"}`}>{index}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function TextField({ id, label, value, onChange, placeholder, required = false }: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}{required && <span className="ml-1 text-accent">*</span>}
      </label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className={inputClassName} />
    </div>
  );
}

function TextAreaField({ id, label, value, onChange, placeholder }: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">{label}</label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className={`${inputClassName} resize-y`} />
    </div>
  );
}
