"use client";

interface OptionSelectBaseProps {
  id: string;
  label: string;
  options: readonly string[];
  columns?: number;
  description?: string;
}

type OptionSelectProps = OptionSelectBaseProps &
  (
    | { multiple?: false; value: string; onChange: (value: string) => void }
    | { multiple: true; value: string[]; onChange: (value: string[]) => void }
  );

export function OptionSelect({
  id,
  label,
  options,
  columns = 3,
  description,
  ...selection
}: OptionSelectProps) {
  function isSelected(option: string) {
    return selection.multiple
      ? selection.value.includes(option)
      : option === selection.value;
  }

  function handleClick(option: string) {
    if (selection.multiple) {
      const next = selection.value.includes(option)
        ? selection.value.filter((item) => item !== option)
        : [...selection.value, option];
      selection.onChange(next);
      return;
    }
    selection.onChange(option);
  }

  return (
    <div className="space-y-2">
      <label
        id={`${id}-label`}
        className="block text-[14px] font-medium text-ink"
      >
        {label}
      </label>
      {description && (
        <p className="text-xs leading-5 text-muted">{description}</p>
      )}
      <div
        role={selection.multiple ? "group" : "radiogroup"}
        aria-labelledby={`${id}-label`}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const selected = isSelected(option);
          return (
            <button
              key={option}
              type="button"
              role={selection.multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              onClick={() => handleClick(option)}
              className={`rounded-md border px-3 py-2.5 text-[13px] font-medium transition active:scale-95 ${
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
