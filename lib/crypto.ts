export const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
};

export async function derivePasswordKey(password: string, salt: ArrayBuffer) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export type EncryptResult =
  | {
      mode: "url-key";
      base64Ciphertext: string;
      base64UrlKey: string;
      base64UrlIv: string;
    }
  | {
      mode: "passphrase";
      base64Ciphertext: string;
      base64PwdSalt: string;
      base64PwdIv: string;
    };

// A passphrase *replaces* the URL key rather than adding a layer on top of
// it: with a passphrase, the passphrase-derived key is the only key that
// ever exists, and it never travels in the URL — the link alone can't
// decrypt it. That's the point (safer against chat apps/link previewers
// that strip URL fragments), not an incidental side effect, so the two
// modes are mutually exclusive rather than stacked.
export async function encryptSecret(
  text: string,
  password?: string
): Promise<EncryptResult> {
  const plaintext = new TextEncoder().encode(text).buffer as ArrayBuffer;

  if (password) {
    const saltArray = crypto.getRandomValues(new Uint8Array(16));
    const ivArray = crypto.getRandomValues(new Uint8Array(12));
    const pwdSaltBuffer = saltArray.buffer as ArrayBuffer;
    const pwdIvBuffer = ivArray.buffer as ArrayBuffer;

    const pwdKey = await derivePasswordKey(password, pwdSaltBuffer);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: pwdIvBuffer },
      pwdKey,
      plaintext
    );

    return {
      mode: "passphrase",
      base64Ciphertext: bufferToBase64(ciphertext),
      base64PwdSalt: bufferToBase64(pwdSaltBuffer),
      base64PwdIv: bufferToBase64(pwdIvBuffer),
    };
  }

  const urlKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const urlIvArray = crypto.getRandomValues(new Uint8Array(12));
  const urlIvBuffer = urlIvArray.buffer as ArrayBuffer;

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: urlIvBuffer },
    urlKey,
    plaintext
  );
  const exportedUrlKey = await crypto.subtle.exportKey("raw", urlKey);

  return {
    mode: "url-key",
    base64Ciphertext: bufferToBase64(ciphertext),
    base64UrlKey: bufferToBase64(exportedUrlKey),
    base64UrlIv: bufferToBase64(urlIvBuffer),
  };
}

export type DecryptInput =
  | { base64Ciphertext: string; urlIv: string; base64UrlKey: string }
  | {
      base64Ciphertext: string;
      pwdSalt: string;
      pwdIv: string;
      password: string;
    };

export async function decryptSecret(input: DecryptInput): Promise<string> {
  if ("pwdSalt" in input) {
    const pwdKey = await derivePasswordKey(
      input.password,
      base64ToBuffer(input.pwdSalt)
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(input.pwdIv) },
      pwdKey,
      base64ToBuffer(input.base64Ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  }

  const urlKey = await crypto.subtle.importKey(
    "raw",
    base64ToBuffer(input.base64UrlKey),
    "AES-GCM",
    true,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(input.urlIv) },
    urlKey,
    base64ToBuffer(input.base64Ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}
