"use client";

import { use, useEffect, useState } from "react";
import { decryptSecret } from "@/lib/crypto";
import { useLocale } from "@/lib/i18n/use-locale";
import { LanguageToggle } from "@/components/LanguageToggle";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

type FetchedPayload = {
  ciphertext: string;
  urlIv?: string;
  pwdSalt?: string;
  pwdIv?: string;
  burnAfterReading: boolean;
};

type Status =
  | "loading"
  | "not-found"
  | "key-missing"
  | "needs-passphrase"
  | "revealed";

export default function ViewSecret({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(paramsPromise);
  const { locale, setLocale, t } = useLocale();

  const [status, setStatus] = useState<Status>("loading");
  const [payload, setPayload] = useState<FetchedPayload | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const [passphraseInput, setPassphraseInput] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch(`/api/secret/${id}`);
      if (cancelled) return;

      if (!res.ok) {
        setStatus("not-found");
        return;
      }

      const data: FetchedPayload = await res.json();
      setPayload(data);

      if (data.pwdSalt && data.pwdIv) {
        setStatus("needs-passphrase");
        return;
      }

      const base64Key = window.location.hash.slice(1);
      if (!base64Key || !data.urlIv) {
        setStatus("key-missing");
        return;
      }

      try {
        const plaintext = await decryptSecret({
          base64Ciphertext: data.ciphertext,
          urlIv: data.urlIv,
          base64UrlKey: base64Key,
        });
        if (cancelled) return;
        setSecret(plaintext);
        setStatus("revealed");
      } catch {
        if (!cancelled) setStatus("key-missing");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleUnlock = async () => {
    if (!payload?.pwdSalt || !payload.pwdIv) return;
    setUnlocking(true);
    setPassphraseError(null);
    try {
      const plaintext = await decryptSecret({
        base64Ciphertext: payload.ciphertext,
        pwdSalt: payload.pwdSalt,
        pwdIv: payload.pwdIv,
        password: passphraseInput,
      });
      setSecret(plaintext);
      setStatus("revealed");
    } catch {
      setPassphraseError(t.view.incorrectPassphrase);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {status === "loading" && (
          <p className="text-sm text-muted">{t.view.fetchingMessage}</p>
        )}

        {status === "not-found" && (
          <p className="text-sm text-red-400">{t.view.notFoundError}</p>
        )}

        {status === "key-missing" && (
          <p className="text-sm text-red-400">{t.view.keyMissingError}</p>
        )}

        {status === "needs-passphrase" && (
          <div className="space-y-4">
            <p className="font-medium">{t.view.passphraseTitle}</p>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUnlock();
                  }
                }}
                placeholder={t.view.passphraseInputPlaceholder}
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
            {passphraseError && (
              <p className="text-sm text-red-400">{passphraseError}</p>
            )}
            <button
              type="button"
              onClick={handleUnlock}
              disabled={unlocking || passphraseInput.length === 0}
              className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-foreground transition-opacity disabled:opacity-50"
            >
              {unlocking ? t.view.unlockingButton : t.view.unlockButton}
            </button>
          </div>
        )}

        {status === "revealed" && secret !== null && (
          <div className="space-y-4">
            <p className="font-medium">{t.view.secretTitle}</p>
            <pre className="whitespace-pre-wrap break-all rounded-xl border border-border bg-background p-3 text-sm">
              {secret}
            </pre>
            <p className="text-xs text-muted">
              {payload?.burnAfterReading
                ? t.view.secretBurnedNotice
                : t.view.secretPersistsNotice}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
