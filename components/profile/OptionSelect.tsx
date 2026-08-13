"use client";

interface OptionSelectProps {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
  description?: string;
}

export function OptionSelect({ id, label, options, value, onChange, columns = 3, description }: OptionSelectProps) {
  return (
    <div className="space-y-2">
      <label id={`${id}-label`} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      {description && (
        <p className="text-xs leading-5 text-muted">{description}</p>
      )}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`rounded-md border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-grid bg-navy-800 text-muted hover:border-grid-strong hover:text-ink"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
