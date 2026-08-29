export const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
};

// Returns standard ArrayBuffer to satisfy Web Crypto strict types
export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
};

export async function derivePasswordKey(password: string, salt: Uint8Array) {
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
      salt: salt as BufferSource, // Cast to BufferSource for TS compatibility
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(text: string, password?: string) {
  let dataToEncrypt: Uint8Array | ArrayBuffer = new TextEncoder().encode(text);
  let pwdSalt: Uint8Array | undefined;
  let pwdIv: Uint8Array | undefined;

  if (password) {
    pwdSalt = crypto.getRandomValues(new Uint8Array(16));
    pwdIv = crypto.getRandomValues(new Uint8Array(12));
    const pwdKey = await derivePasswordKey(password, pwdSalt);
    
    const innerCiphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: pwdIv as BufferSource },
      pwdKey,
      dataToEncrypt
    );
    dataToEncrypt = innerCiphertext;
  }

  const urlKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, 
    true, 
    ["encrypt", "decrypt"]
  );
  const urlIv = crypto.getRandomValues(new Uint8Array(12));
  
  const outerCiphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: urlIv as BufferSource },
    urlKey,
    dataToEncrypt
  );

  const exportedUrlKey = await crypto.subtle.exportKey("raw", urlKey);

  return {
    base64UrlKey: bufferToBase64(exportedUrlKey),
    base64UrlIv: bufferToBase64(urlIv.buffer as ArrayBuffer),
    base64Ciphertext: bufferToBase64(outerCiphertext),
    base64PwdSalt: pwdSalt ? bufferToBase64(pwdSalt.buffer as ArrayBuffer) : undefined,
    base64PwdIv: pwdIv ? bufferToBase64(pwdIv.buffer as ArrayBuffer) : undefined,
  };
}

export async function decryptSecret(
  base64Ciphertext: string, 
  base64UrlKey: string, 
  base64UrlIv: string,
  password?: string,
  base64PwdSalt?: string,
  base64PwdIv?: string
) {
  const urlKey = await crypto.subtle.importKey(
    "raw", 
    base64ToBuffer(base64UrlKey), 
    "AES-GCM", 
    true, 
    ["decrypt"]
  );
  
  let decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(base64UrlIv) },
    urlKey,
    base64ToBuffer(base64Ciphertext)
  );

  if (base64PwdSalt && base64PwdIv) {
    if (!password) throw new Error("PASSWORD_REQUIRED");
    
    const pwdSaltBuffer = base64ToBuffer(base64PwdSalt);
    const pwdKey = await derivePasswordKey(password, new Uint8Array(pwdSaltBuffer));
    
    decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(base64PwdIv) },
      pwdKey,
      decryptedData
    );
  }

  return new TextDecoder().decode(decryptedData);
}