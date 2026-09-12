import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips in url-key mode (no passphrase)", async () => {
    const plaintext = "a very secret token";
    const encrypted = await encryptSecret(plaintext);

    expect(encrypted.mode).toBe("url-key");
    if (encrypted.mode !== "url-key") throw new Error("unreachable");

    const decrypted = await decryptSecret({
      base64Ciphertext: encrypted.base64Ciphertext,
      urlIv: encrypted.base64UrlIv,
      base64UrlKey: encrypted.base64UrlKey,
    });
    expect(decrypted).toBe(plaintext);
  });

  it("round-trips in passphrase mode, with no url key produced at all", async () => {
    const plaintext = "another secret value";
    const encrypted = await encryptSecret(plaintext, "correct horse battery");

    expect(encrypted.mode).toBe("passphrase");
    if (encrypted.mode !== "passphrase") throw new Error("unreachable");
    // The whole point: no key material exists to put in a URL.
    expect(encrypted).not.toHaveProperty("base64UrlKey");
    expect(encrypted).not.toHaveProperty("base64UrlIv");

    const decrypted = await decryptSecret({
      base64Ciphertext: encrypted.base64Ciphertext,
      pwdSalt: encrypted.base64PwdSalt,
      pwdIv: encrypted.base64PwdIv,
      password: "correct horse battery",
    });
    expect(decrypted).toBe(plaintext);
  });

  it("fails to decrypt passphrase mode with the wrong passphrase", async () => {
    const encrypted = await encryptSecret("secret", "right-passphrase");
    if (encrypted.mode !== "passphrase") throw new Error("unreachable");

    await expect(
      decryptSecret({
        base64Ciphertext: encrypted.base64Ciphertext,
        pwdSalt: encrypted.base64PwdSalt,
        pwdIv: encrypted.base64PwdIv,
        password: "wrong-passphrase",
      })
    ).rejects.toThrow();
  });

  it("fails to decrypt url-key mode with a different (wrong) key", async () => {
    const encrypted = await encryptSecret("secret");
    const other = await encryptSecret("unrelated");
    if (encrypted.mode !== "url-key" || other.mode !== "url-key") {
      throw new Error("unreachable");
    }

    await expect(
      decryptSecret({
        base64Ciphertext: encrypted.base64Ciphertext,
        urlIv: encrypted.base64UrlIv,
        base64UrlKey: other.base64UrlKey, // a real key, just the wrong one
      })
    ).rejects.toThrow();
  });

  it("round-trips text containing multi-byte UTF-8 characters", async () => {
    const plaintext = "clave secreta: contraseña, ñandú, 日本語";
    const encrypted = await encryptSecret(plaintext);
    if (encrypted.mode !== "url-key") throw new Error("unreachable");

    const decrypted = await decryptSecret({
      base64Ciphertext: encrypted.base64Ciphertext,
      urlIv: encrypted.base64UrlIv,
      base64UrlKey: encrypted.base64UrlKey,
    });
    expect(decrypted).toBe(plaintext);
  });
});
