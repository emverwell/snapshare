import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = Redis.fromEnv();

export function errorResponse(
  status: number,
  error: string,
  headers?: HeadersInit
) {
  return NextResponse.json({ error }, { status, headers });
}

// Real browser traffic always sends Origin on POST/PUT/DELETE/PATCH, same-
// origin or not — only non-browser callers omit it, so requiring it (rather
// than only checking it when present) is what makes this filter anything
// instead of only the traffic least likely to be hostile. Compared against
// the Host header, not a same-origin URL reconstructed from req.url: under
// a standalone server (this app's Docker image), req.url is built from the
// server's own bind address/port (HOSTNAME/PORT env vars), not the client-
// visible host, so it never matches a real Origin — Host is what the client
// actually connected to regardless of how the process is bound internally.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  return !!originHost && !!host && originHost === host;
}

// Fixed by the AES-GCM/PBKDF2 scheme in lib/crypto.ts: 12-byte IVs, 16-byte salt.
export const IV_B64_LEN = 16; // base64(12 bytes), no padding
export const SALT_B64_LEN = 24; // base64(16 bytes), with "==" padding

// Ceiling on the one variable-length field: how much plaintext a secret may
// contain before encryption. 32KB comfortably covers real-world pasted
// secrets (SSH keys, service-account JSON, kubeconfigs) without being
// unbounded.
const MAX_SECRET_PLAINTEXT_BYTES = 32 * 1024;
const GCM_TAG_BYTES = 16;
export const MAX_CIPHERTEXT_B64_LEN =
  Math.ceil((MAX_SECRET_PLAINTEXT_BYTES + GCM_TAG_BYTES) / 3) * 4;

// Total request body ceiling: the four fields' max sizes plus JSON
// punctuation/key-name overhead (~44KB), rounded up with headroom.
export const MAX_BODY_BYTES = 48 * 1024;

const BASE64_RE =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

// String length alone doesn't pin down decoded byte length once padding is
// involved (an 11-byte value pads out to the same 16 characters as a real
// 12-byte IV), so the two fixed-size fields get exact-shape regexes instead
// of a length check: 12 bytes never pads, 16 bytes always pads with "==".
const IV_B64_RE = /^[A-Za-z0-9+/]{16}$/;
const SALT_B64_RE = /^[A-Za-z0-9+/]{22}==$/;

function createIpRatelimit(
  prefix: string,
  tokens: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1]
) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
  });
}

export const secretWriteRatelimit = createIpRatelimit(
  "ratelimit:secret:write",
  5,
  "60 s"
);
// Reads have no size/compute cost to bound, but still cost a Redis command
// per hit (including hits on nonexistent ids) so still need a ceiling; a
// higher budget than writes since a legitimate viewer may load/retry a link.
export const secretReadRatelimit = createIpRatelimit(
  "ratelimit:secret:read",
  20,
  "60 s"
);

/**
 * Only safe as an identity key if whatever sits directly in front of this
 * app overwrites (or strips-then-sets) x-forwarded-for from the real TCP
 * peer, rather than passing through a client-supplied value. True on
 * Vercel's edge today.
 *
 * TODO: revisit if this app is ever self-hosted, or if anything (a CDN, a
 * WAF, a reverse proxy) is ever placed in front of Vercel's own edge —
 * either can let a client-supplied header through unsanitized, letting a
 * client send a different X-Forwarded-For value on every request and fully
 * defeat the rate limiters above (not just misattribute them). Revisit
 * before that happens, not after.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Matches crypto.randomUUID() output exactly (lowercase v4) — anything else
// was never a key we issued, so reject before spending a Redis round trip.
const SECRET_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isValidSecretId(id: string): boolean {
  return SECRET_ID_RE.test(id);
}

/**
 * Reads the request body while enforcing maxBytes against the real stream,
 * not just the (spoofable, or absent under chunked encoding) Content-Length
 * header. Returns null if the body exceeds the cap.
 */
export async function readBodyWithLimit(
  req: Request,
  maxBytes: number
): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
}

export type SecretPayload = {
  ciphertext: string;
  urlIv: string;
  pwdSalt?: string;
  pwdIv?: string;
};

const ALLOWED_KEYS = new Set(["ciphertext", "urlIv", "pwdSalt", "pwdIv"]);

export function validateSecretPayload(body: unknown): SecretPayload | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_KEYS.has(key))) {
    return null;
  }

  const { ciphertext, urlIv, pwdSalt, pwdIv } = record;

  if (
    typeof ciphertext !== "string" ||
    ciphertext.length === 0 ||
    ciphertext.length > MAX_CIPHERTEXT_B64_LEN ||
    !BASE64_RE.test(ciphertext)
  ) {
    return null;
  }

  if (typeof urlIv !== "string" || !IV_B64_RE.test(urlIv)) {
    return null;
  }

  const hasPwdSalt = pwdSalt !== undefined;
  const hasPwdIv = pwdIv !== undefined;
  if (hasPwdSalt !== hasPwdIv) return null;

  if (hasPwdSalt) {
    if (
      typeof pwdSalt !== "string" ||
      !SALT_B64_RE.test(pwdSalt) ||
      typeof pwdIv !== "string" ||
      !IV_B64_RE.test(pwdIv)
    ) {
      return null;
    }
  }

  return {
    ciphertext,
    urlIv,
    pwdSalt: pwdSalt as string | undefined,
    pwdIv: pwdIv as string | undefined,
  };
}
