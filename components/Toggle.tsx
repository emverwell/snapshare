"use client";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 appearance-none rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full transition-transform ${
          checked
            ? "translate-x-6 bg-accent-foreground"
            : "translate-x-1 bg-muted"
        }`}
      />
    </button>
  );
}
