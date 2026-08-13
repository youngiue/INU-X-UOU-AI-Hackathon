"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  description?: string;
}

export function TagInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  function addTag(rawTag: string) {
    const tag = rawTag.trim();
    if (!tag || value.includes(tag)) {
      setInputValue("");
      return;
    }

    onChange([...value, tag]);
    setInputValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(inputValue);
    }
  }

  function removeTag(tagToRemove: string) {
    onChange(value.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      {description && (
        <p id={`${id}-description`} className="text-xs leading-5 text-muted">
          {description}
        </p>
      )}
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-grid bg-navy-800 px-3 py-2 focus-within:border-accent2 focus-within:ring-2 focus-within:ring-accent2/20">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => removeTag(tag)}
            className="inline-flex items-center gap-1 rounded-md bg-panel-light px-2 py-1 text-xs text-ink transition-colors hover:bg-grid"
            aria-label={`${tag} 삭제`}
          >
            {tag}
            <X aria-hidden="true" size={12} strokeWidth={2} />
          </button>
        ))}
        <input
          id={id}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={value.length === 0 ? placeholder : undefined}
          aria-describedby={description ? `${id}-description` : undefined}
          className="min-w-32 flex-1 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-muted-dim focus:shadow-none"
        />
      </div>
      <p className="text-xs text-muted-dim">Enter 또는 쉼표로 추가 · 태그를 누르면 삭제</p>
    </div>
  );
}
