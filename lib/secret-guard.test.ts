import { afterEach, describe, expect, it, vi } from "vitest";
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
const lifetimeSeconds = 86400;
const burnAfterReading = true;

describe("validateSecretPayload", () => {
  it("accepts a valid url-key-mode payload", () => {
    const result = validateSecretPayload({
      ciphertext,
      urlIv,
      lifetimeSeconds,
      burnAfterReading,
    });
    expect(result).toEqual({ ciphertext, urlIv, lifetimeSeconds, burnAfterReading });
  });

  it("accepts a valid passphrase-mode payload", () => {
    const result = validateSecretPayload({
      ciphertext,
      pwdSalt,
      pwdIv,
      lifetimeSeconds,
      burnAfterReading,
    });
    expect(result).toEqual({
      ciphertext,
      pwdSalt,
      pwdIv,
      lifetimeSeconds,
      burnAfterReading,
    });
  });

  it("rejects both urlIv and pwdSalt/pwdIv present together", () => {
    // A passphrase replaces the URL key rather than adding to it — the two
    // modes are mutually exclusive, not stackable.
    expect(
      validateSecretPayload({
        ciphertext,
        urlIv,
        pwdSalt,
        pwdIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects neither urlIv nor pwdSalt/pwdIv present", () => {
    expect(
      validateSecretPayload({ ciphertext, lifetimeSeconds, burnAfterReading })
    ).toBeNull();
  });

  it.each([null, undefined, "string", 42, ["array"]])(
    "rejects non-object bodies (%p)",
    (body) => {
      expect(validateSecretPayload(body)).toBeNull();
    }
  );

  it("rejects an unknown extra key", () => {
    expect(
      validateSecretPayload({
        ciphertext,
        urlIv,
        lifetimeSeconds,
        burnAfterReading,
        extra: "nope",
      })
    ).toBeNull();
  });

  it("rejects a missing ciphertext", () => {
    expect(
      validateSecretPayload({ urlIv, lifetimeSeconds, burnAfterReading })
    ).toBeNull();
  });

  it("rejects an empty ciphertext", () => {
    expect(
      validateSecretPayload({
        ciphertext: "",
        urlIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects a non-string ciphertext", () => {
    expect(
      validateSecretPayload({
        ciphertext: 12345,
        urlIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects ciphertext with invalid base64 characters", () => {
    expect(
      validateSecretPayload({
        ciphertext: "not_base64-url!!",
        urlIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("accepts ciphertext exactly at the max length", () => {
    // MAX_CIPHERTEXT_B64_LEN corresponds to 32KB plaintext + 16-byte GCM tag,
    // base64-encoded; construct one at exactly that boundary.
    const maxBytes = (MAX_CIPHERTEXT_B64_LEN / 4) * 3;
    const atMax = b64(maxBytes);
    expect(atMax.length).toBe(MAX_CIPHERTEXT_B64_LEN);
    expect(
      validateSecretPayload({
        ciphertext: atMax,
        urlIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).not.toBeNull();
  });

  it("rejects ciphertext one base64 group past the max length", () => {
    const maxBytes = (MAX_CIPHERTEXT_B64_LEN / 4) * 3;
    const overMax = b64(maxBytes + 3);
    expect(overMax.length).toBe(MAX_CIPHERTEXT_B64_LEN + 4);
    expect(
      validateSecretPayload({
        ciphertext: overMax,
        urlIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it.each([b64(11), b64(13)])(
    "rejects a urlIv of the wrong byte length (%s)",
    (badIv) => {
      expect(
        validateSecretPayload({
          ciphertext,
          urlIv: badIv,
          lifetimeSeconds,
          burnAfterReading,
        })
      ).toBeNull();
    }
  );

  it("rejects a urlIv with invalid base64 characters", () => {
    expect(
      validateSecretPayload({
        ciphertext,
        urlIv: "!!!!!!!!!!!!!!!!",
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects pwdSalt present without pwdIv", () => {
    expect(
      validateSecretPayload({
        ciphertext,
        pwdSalt,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects pwdIv present without pwdSalt", () => {
    expect(
      validateSecretPayload({
        ciphertext,
        pwdIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects a pwdSalt of the wrong byte length", () => {
    expect(
      validateSecretPayload({
        ciphertext,
        pwdSalt: b64(15),
        pwdIv,
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("rejects a pwdIv of the wrong byte length", () => {
    expect(
      validateSecretPayload({
        ciphertext,
        pwdSalt,
        pwdIv: b64(11),
        lifetimeSeconds,
        burnAfterReading,
      })
    ).toBeNull();
  });

  it("sanity-checks the exact-length constants against real base64 output", () => {
    expect(urlIv.length).toBe(IV_B64_LEN);
    expect(pwdSalt.length).toBe(SALT_B64_LEN);
  });

  it.each([0, 1000, 43200, 86401, -86400])(
    "rejects a lifetimeSeconds outside the allowed set (%p)",
    (badLifetime) => {
      expect(
        validateSecretPayload({
          ciphertext,
          urlIv,
          lifetimeSeconds: badLifetime,
          burnAfterReading,
        })
      ).toBeNull();
    }
  );

  it.each([900, 3600, 21600, 86400])(
    "accepts each allowed lifetimeSeconds value (%p)",
    (goodLifetime) => {
      expect(
        validateSecretPayload({
          ciphertext,
          urlIv,
          lifetimeSeconds: goodLifetime,
          burnAfterReading,
        })
      ).not.toBeNull();
    }
  );

  it("rejects a missing burnAfterReading", () => {
    expect(
      validateSecretPayload({ ciphertext, urlIv, lifetimeSeconds })
    ).toBeNull();
  });

  it.each(["true", 1, 0, null])(
    "rejects a non-boolean burnAfterReading (%p)",
    (badValue) => {
      expect(
        validateSecretPayload({
          ciphertext,
          urlIv,
          lifetimeSeconds,
          burnAfterReading: badValue,
        })
      ).toBeNull();
    }
  );
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

describe("getRedis (lazy client construction)", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    vi.resetModules();
  });

  it("importing the module does not construct the client, even with an invalid URL", async () => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = "not-a-valid-url";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    // Regression test for a real prod incident: Redis.fromEnv() used to run
    // at module scope, so merely importing this file crashed on a bad env
    // var — including during Next's build-time config-collection pass,
    // which imports route modules without necessarily having a real runtime
    // env available yet.
    await expect(import("./secret-guard")).resolves.toBeDefined();
  });

  it("still throws on first real use if the URL is invalid", async () => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = "not-a-valid-url";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const mod = await import("./secret-guard");
    expect(() => mod.getRedis()).toThrow();
  });

  it("reuses the same client instance across repeated calls", async () => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const mod = await import("./secret-guard");
    expect(mod.getRedis()).toBe(mod.getRedis());
  });
});
