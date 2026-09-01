import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Fixed by the AES-GCM/PBKDF2 scheme in lib/crypto.ts: 12-byte IVs, 16-byte salt.
const IV_B64_LEN = 16; // base64(12 bytes), no padding
const SALT_B64_LEN = 24; // base64(16 bytes), with "==" padding

// Ceiling on the one variable-length field: how much plaintext a secret may
// contain before encryption. 32KB comfortably covers real-world pasted
// secrets (SSH keys, service-account JSON, kubeconfigs) without being
// unbounded.
const MAX_SECRET_PLAINTEXT_BYTES = 32 * 1024;
const GCM_TAG_BYTES = 16;
const MAX_CIPHERTEXT_B64_LEN =
  Math.ceil((MAX_SECRET_PLAINTEXT_BYTES + GCM_TAG_BYTES) / 3) * 4;

// Total request body ceiling: the four fields' max sizes plus JSON
// punctuation/key-name overhead (~44KB), rounded up with headroom.
export const MAX_BODY_BYTES = 48 * 1024;

const BASE64_RE =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

export const secretRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:secret",
});

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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

  if (
    typeof urlIv !== "string" ||
    urlIv.length !== IV_B64_LEN ||
    !BASE64_RE.test(urlIv)
  ) {
    return null;
  }

  const hasPwdSalt = pwdSalt !== undefined;
  const hasPwdIv = pwdIv !== undefined;
  if (hasPwdSalt !== hasPwdIv) return null;

  if (hasPwdSalt) {
    if (
      typeof pwdSalt !== "string" ||
      pwdSalt.length !== SALT_B64_LEN ||
      !BASE64_RE.test(pwdSalt) ||
      typeof pwdIv !== "string" ||
      pwdIv.length !== IV_B64_LEN ||
      !BASE64_RE.test(pwdIv)
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
