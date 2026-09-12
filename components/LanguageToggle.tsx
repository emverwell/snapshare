"use client";

import type { Locale } from "@/lib/i18n/translations";

export function LanguageToggle({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-1 text-xs">
      {(["en", "es"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={locale === option}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors ${
            locale === option
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
