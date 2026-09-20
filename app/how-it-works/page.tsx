"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/use-locale";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function HowItWorks() {
  const { locale, setLocale, t } = useLocale();

  const steps = [
    { title: t.howItWorks.step1Title, body: t.howItWorks.step1Body },
    { title: t.howItWorks.step2Title, body: t.howItWorks.step2Body },
    { title: t.howItWorks.step3Title, body: t.howItWorks.step3Body },
    { title: t.howItWorks.step4Title, body: t.howItWorks.step4Body },
  ];

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <SiteHeader
        locale={locale}
        onLocaleChange={setLocale}
        brand={t.nav.brand}
        howItWorksLabel={t.nav.howItWorks}
      />

      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
        {t.howItWorks.eyebrow}
      </p>
      <h1 className="mb-4 font-serif text-4xl leading-tight">
        {t.howItWorks.title}
      </h1>
      <p className="mb-12 max-w-md text-sm leading-relaxed text-muted">
        {t.howItWorks.intro}
      </p>

      <div className="space-y-10">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-4">
            <span className="font-mono text-sm text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="mb-1 font-medium">{step.title}</p>
              <p className="text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border p-6">
        <h2 className="mb-2 font-serif text-2xl">{t.howItWorks.notTitle}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {t.howItWorks.notBody}
        </p>
      </div>

      <Link
        href="/"
        className="mt-8 block w-full rounded-xl bg-accent py-3 text-center font-semibold text-accent-foreground transition-opacity hover:opacity-90"
      >
        {t.howItWorks.cta}
      </Link>

      <SiteFooter t={t} />
    </main>
  );
}
