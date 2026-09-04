import { describe, expect, it } from "vitest";
import {
  MAX_CIPHERTEXT_B64_LEN,
  IV_B64_LEN,
  SALT_B64_LEN,
  getClientIp,
  isValidSecretId,
  readBodyWithLimit,
  validateSecretPayload,
} from "./secret-guard";

function b64(byteLength: number): string {
  return Buffer.from(new Uint8Array(byteLength).fill(7)).toString("base64");
}

const urlIv = b64(12); // IV_B64_LEN chars, no padding
const pwdSalt = b64(16); // SALT_B64_LEN chars, "==" padding
const pwdIv = b64(12);
const ciphertext = b64(48); // arbitrary small valid ciphertext

describe("validateSecretPayload", () => {
  it("accepts a minimal valid payload (no password)", () => {
    const result = validateSecretPayload({ ciphertext, urlIv });
    expect(result).toEqual({
      ciphertext,
      urlIv,
      pwdSalt: undefined,
      pwdIv: undefined,
    });
  });

  it("accepts a valid payload with a paired password salt/iv", () => {
    const result = validateSecretPayload({ ciphertext, urlIv, pwdSalt, pwdIv });
    expect(result).toEqual({ ciphertext, urlIv, pwdSalt, pwdIv });
  });

  it.each([null, undefined, "string", 42, ["array"]])(
    "rejects non-object bodies (%p)",
    (body) => {
      expect(validateSecretPayload(body)).toBeNull();
    }
  );

  it("rejects an unknown extra key", () => {
    expect(
      validateSecretPayload({ ciphertext, urlIv, extra: "nope" })
    ).toBeNull();
  });

  it("rejects a missing ciphertext", () => {
    expect(validateSecretPayload({ urlIv })).toBeNull();
  });

  it("rejects an empty ciphertext", () => {
    expect(validateSecretPayload({ ciphertext: "", urlIv })).toBeNull();
  });

  it("rejects a non-string ciphertext", () => {
    expect(validateSecretPayload({ ciphertext: 12345, urlIv })).toBeNull();
  });

  it("rejects ciphertext with invalid base64 characters", () => {
    expect(
      validateSecretPayload({ ciphertext: "not_base64-url!!", urlIv })
    ).toBeNull();
  });

  it("accepts ciphertext exactly at the max length", () => {
    // MAX_CIPHERTEXT_B64_LEN corresponds to 32KB plaintext + 16-byte GCM tag,
    // base64-encoded; construct one at exactly that boundary.
    const maxBytes = (MAX_CIPHERTEXT_B64_LEN / 4) * 3;
    const atMax = b64(maxBytes);
    expect(atMax.length).toBe(MAX_CIPHERTEXT_B64_LEN);
    expect(validateSecretPayload({ ciphertext: atMax, urlIv })).not.toBeNull();
  });

  it("rejects ciphertext one base64 group past the max length", () => {
    const maxBytes = (MAX_CIPHERTEXT_B64_LEN / 4) * 3;
    const overMax = b64(maxBytes + 3);
    expect(overMax.length).toBe(MAX_CIPHERTEXT_B64_LEN + 4);
    expect(validateSecretPayload({ ciphertext: overMax, urlIv })).toBeNull();
  });

  it("rejects a missing urlIv", () => {
    expect(validateSecretPayload({ ciphertext })).toBeNull();
  });

  it.each([b64(11), b64(13)])(
    "rejects a urlIv of the wrong byte length (%s)",
    (badIv) => {
      expect(validateSecretPayload({ ciphertext, urlIv: badIv })).toBeNull();
    }
  );

  it("rejects a urlIv with invalid base64 characters", () => {
    expect(
      validateSecretPayload({ ciphertext, urlIv: "!!!!!!!!!!!!!!!!" })
    ).toBeNull();
  });

  it("rejects pwdSalt present without pwdIv", () => {
    expect(validateSecretPayload({ ciphertext, urlIv, pwdSalt })).toBeNull();
  });

  it("rejects pwdIv present without pwdSalt", () => {
    expect(validateSecretPayload({ ciphertext, urlIv, pwdIv })).toBeNull();
  });

  it("rejects a pwdSalt of the wrong byte length", () => {
    expect(
      validateSecretPayload({ ciphertext, urlIv, pwdSalt: b64(15), pwdIv })
    ).toBeNull();
  });

  it("rejects a pwdIv of the wrong byte length", () => {
    expect(
      validateSecretPayload({ ciphertext, urlIv, pwdSalt, pwdIv: b64(11) })
    ).toBeNull();
  });

  it("sanity-checks the exact-length constants against real base64 output", () => {
    expect(urlIv.length).toBe(IV_B64_LEN);
    expect(pwdSalt.length).toBe(SALT_B64_LEN);
  });
});

describe("isValidSecretId", () => {
  it("accepts a real crypto.randomUUID() output", () => {
    expect(isValidSecretId(crypto.randomUUID())).toBe(true);
  });

  it("rejects an uppercase UUID", () => {
    expect(isValidSecretId(crypto.randomUUID().toUpperCase())).toBe(false);
  });

  it("rejects a non-UUID string", () => {
    expect(isValidSecretId("not-a-uuid")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidSecretId("")).toBe(false);
  });

  it("rejects a path-traversal-shaped string", () => {
    expect(isValidSecretId("../../etc/passwd")).toBe(false);
  });

  it("rejects a UUID with the wrong version nibble", () => {
    // swap the version 4 marker for a 1
    const id = crypto.randomUUID().replace(/^(.{14})4/, "$11");
    expect(isValidSecretId(id)).toBe(false);
  });
});

describe("getClientIp", () => {
  it("reads a single x-forwarded-for value", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.5" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("takes the first hop of a multi-value x-forwarded-for", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it('falls back to "unknown" when neither header is present', () => {
    const req = new Request("http://localhost/");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("readBodyWithLimit", () => {
  it("returns the full body when under the limit", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      body: "hello",
    });
    expect(await readBodyWithLimit(req, 100)).toBe("hello");
  });

  it("returns the full body when exactly at the limit", async () => {
    const body = "x".repeat(10);
    const req = new Request("http://localhost/", { method: "POST", body });
    expect(await readBodyWithLimit(req, 10)).toBe(body);
  });

  it("returns null when the body exceeds the limit", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      body: "x".repeat(11),
    });
    expect(await readBodyWithLimit(req, 10)).toBeNull();
  });

  it("returns null when there is no body stream", async () => {
    const req = new Request("http://localhost/");
    expect(await readBodyWithLimit(req, 10)).toBeNull();
  });
});
