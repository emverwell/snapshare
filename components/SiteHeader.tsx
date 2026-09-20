"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n/translations";
import { LanguageToggle } from "@/components/LanguageToggle";

export function SiteHeader({
  locale,
  onLocaleChange,
  brand,
  howItWorksLabel,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  brand: string;
  howItWorksLabel: string;
}) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <Link href="/" className="font-serif text-lg tracking-tight">
        {brand}
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/how-it-works"
          className="text-sm text-muted hover:text-foreground"
        >
          {howItWorksLabel}
        </Link>
        <LanguageToggle locale={locale} onChange={onLocaleChange} />
      </div>
    </div>
  );
}
