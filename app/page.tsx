"use client";

import { useState } from "react";
import { encryptSecret } from "@/lib/crypto";
import {
  ALLOWED_LIFETIMES_SECONDS,
  MAX_SECRET_PLAINTEXT_BYTES,
  type LifetimeSeconds,
} from "@/lib/secret-limits";
import { useLocale } from "@/lib/i18n/use-locale";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LifetimeSelector } from "@/components/LifetimeSelector";
import { Toggle } from "@/components/Toggle";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

const LIFETIME_LABEL_KEYS: Record<LifetimeSeconds, string> = {
  900: "lifetime15min",
  3600: "lifetime1hour",
  21600: "lifetime6hours",
  86400: "lifetime24hours",
};

export default function Home() {
  const { locale, setLocale, t } = useLocale();

  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [lifetimeSeconds, setLifetimeSeconds] = useState<LifetimeSeconds>(86400);
  const [burnAfterReading, setBurnAfterReading] = useState(true);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [resultBurnAfterReading, setResultBurnAfterReading] = useState(true);
  const [resultLifetimeSeconds, setResultLifetimeSeconds] =
    useState<LifetimeSeconds>(86400);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const secretBytes = new TextEncoder().encode(secret).length;
  const overLimit = secretBytes > MAX_SECRET_PLAINTEXT_BYTES;
  const canSubmit = secret.trim().length > 0 && !overLimit && !loading;

  const lifetimeOptions = ALLOWED_LIFETIMES_SECONDS.map((seconds) => ({
    seconds,
    label: t.home[LIFETIME_LABEL_KEYS[seconds] as keyof typeof t.home],
  }));

  const handleCreateSecret = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setShareUrl(null);

    try {
      const encrypted = await encryptSecret(secret, passphrase || undefined);

      const res = await fetch("/api/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: encrypted.base64Ciphertext,
          ...(encrypted.mode === "url-key"
            ? { urlIv: encrypted.base64UrlIv }
            : { pwdSalt: encrypted.base64PwdSalt, pwdIv: encrypted.base64PwdIv }),
          lifetimeSeconds,
          burnAfterReading,
        }),
      });

      if (!res.ok) throw new Error("request failed");

      const { id } = await res.json();

      const origin = window.location.origin;
      const generatedUrl =
        encrypted.mode === "url-key"
          ? `${origin}/secret/${id}#${encrypted.base64UrlKey}`
          : `${origin}/secret/${id}`;

      setShareUrl(generatedUrl);
      setResultBurnAfterReading(burnAfterReading);
      setResultLifetimeSeconds(lifetimeSeconds);
      setSecret("");
      setPassphrase("");
    } catch {
      setError(t.home.genericError);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resultLifetimeLabel =
    t.home[LIFETIME_LABEL_KEYS[resultLifetimeSeconds] as keyof typeof t.home];
  const resultMessage = (
    resultBurnAfterReading ? t.home.resultBurnTrue : t.home.resultBurnFalse
  ).replace("{lifetime}", resultLifetimeLabel);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="mb-6 flex items-start justify-between gap-4">
        <p className="max-w-md text-sm leading-relaxed text-muted">
          {t.home.intro}
        </p>
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>

      {!shareUrl ? (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="secret" className="font-medium">
                {t.home.secretLabel}
              </label>
              <span
                className={`font-mono text-xs ${
                  overLimit ? "text-red-400" : "text-muted"
                }`}
              >
                {secretBytes.toLocaleString()} /{" "}
                {MAX_SECRET_PLAINTEXT_BYTES.toLocaleString()}
              </span>
            </div>
            <textarea
              id="secret"
              required
              rows={7}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleCreateSecret();
                }
              }}
              placeholder={t.home.secretPlaceholder}
              className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
            />
            <p className="mt-2 text-xs text-muted">{t.home.keyboardHint}</p>
          </div>

          <div>
            <p className="mb-2 font-medium">{t.home.lifetimeLabel}</p>
            <LifetimeSelector
              value={lifetimeSeconds}
              onChange={setLifetimeSeconds}
              options={lifetimeOptions}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="font-medium">{t.home.burnLabel}</p>
              <p className="text-sm text-muted">{t.home.burnDescription}</p>
            </div>
            <Toggle
              checked={burnAfterReading}
              onChange={setBurnAfterReading}
              label={t.home.burnLabel}
              onLabel={t.home.burnOn}
              offLabel={t.home.burnOff}
            />
          </div>

          <div>
            <label htmlFor="passphrase" className="mb-2 block font-medium">
              {t.home.passphraseLabel}
            </label>
            <div className="relative">
              <input
                id="passphrase"
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t.home.passphrasePlaceholder}
                className="w-full rounded-xl border border-border bg-background p-3 pr-11 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase((v) => !v)}
                aria-label={
                  showPassphrase ? t.home.hidePassphrase : t.home.showPassphrase
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showPassphrase ? (
                  <EyeOffIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">{t.home.passphraseHint}</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleCreateSecret}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-foreground transition-opacity disabled:opacity-50"
          >
            {loading ? t.home.creatingButton : t.home.createButton}
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <p className="font-medium">{t.home.resultTitle}</p>
          <p className="text-sm text-muted">{resultMessage}</p>
          <div className="flex gap-2">
            <input
              readOnly
              type="text"
              value={shareUrl}
              className="flex-1 rounded-xl border border-border bg-background p-3 text-sm text-muted"
            />
            <button
              onClick={handleCopy}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-muted"
            >
              {copied ? t.home.copiedButton : t.home.copyButton}
            </button>
          </div>
          <button
            onClick={() => setShareUrl(null)}
            className="text-sm text-muted underline hover:text-foreground"
          >
            {t.home.createAnotherButton}
          </button>
        </div>
      )}
    </main>
  );
}
