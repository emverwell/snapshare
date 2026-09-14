"use client";

export function Toggle({
  checked,
  onChange,
  label,
  onLabel,
  offLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-border p-1 text-xs"
    >
      {([false, true] as const).map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={checked === option}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors ${
            checked === option
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option ? onLabel : offLabel}
        </button>
      ))}
    </div>
  );
}
