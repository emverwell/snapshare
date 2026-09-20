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
      <Link href="/" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size
            wordmark, not worth the sharp dependency next/image needs for
            self-hosted (non-Vercel) optimization */}
        <img src="/logo.png" alt={brand} width={150} height={50} />
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
