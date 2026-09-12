"use client";

import type { LifetimeSeconds } from "@/lib/secret-limits";

export function LifetimeSelector({
  value,
  onChange,
  options,
}: {
  value: LifetimeSeconds;
  onChange: (value: LifetimeSeconds) => void;
  options: { seconds: LifetimeSeconds; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <button
          key={option.seconds}
          type="button"
          onClick={() => onChange(option.seconds)}
          aria-pressed={value === option.seconds}
          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
            value === option.seconds
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-card text-foreground hover:border-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
