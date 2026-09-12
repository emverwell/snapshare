// Client-safe: no Redis/server dependencies, so the create-secret page can
// import these directly for the live character counter and lifetime
// selector without pulling server-only code into the client bundle.

// How much plaintext a secret may contain before encryption. 32KB
// comfortably covers real-world pasted secrets (SSH keys, service-account
// JSON, kubeconfigs) without being unbounded.
export const MAX_SECRET_PLAINTEXT_BYTES = 32 * 1024;

export const ALLOWED_LIFETIMES_SECONDS = [900, 3600, 21600, 86400] as const;
export type LifetimeSeconds = (typeof ALLOWED_LIFETIMES_SECONDS)[number];

export function isAllowedLifetime(value: unknown): value is LifetimeSeconds {
  return (
    typeof value === "number" &&
    (ALLOWED_LIFETIMES_SECONDS as readonly number[]).includes(value)
  );
}
