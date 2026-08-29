export const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
};

export const base64ToBuffer = (base64: string) => {
  const binary = atob(base64);
  return new Uint8Array(Array.from(binary).map(char => char.charCodeAt(0))).buffer;
};

export async function encryptSecret(text: string, password?: string) {
  let dataToEncrypt = new TextEncoder().encode(text);
  let pwdSalt, pwdIv;

  // Layer 1: Optional Password Encryption
  if (password) {
    pwdSalt = crypto.getRandomValues(new Uint8Array(16));
    pwdIv = crypto.getRandomValues(new Uint8Array(12));
    const pwdKey = await derivePasswordKey(password, pwdSalt);
    
    const innerCiphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: pwdIv },
      pwdKey,
      dataToEncrypt
    );
    dataToEncrypt = new Uint8Array(innerCiphertext); // Prepare for outer encryption
  }

  // Layer 2: Mandatory URL Hash Encryption
  const urlKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const urlIv = crypto.getRandomValues(new Uint8Array(12));
  
  const outerCiphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: urlIv },
    urlKey,
    dataToEncrypt
  );

  const exportedUrlKey = await crypto.subtle.exportKey("raw", urlKey);

  return {
    base64UrlKey: bufferToBase64(exportedUrlKey),
    base64UrlIv: bufferToBase64(urlIv),
    base64Ciphertext: bufferToBase64(outerCiphertext),
    base64PwdSalt: pwdSalt ? bufferToBase64(pwdSalt) : undefined,
    base64PwdIv: pwdIv ? bufferToBase64(pwdIv) : undefined,
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
  // Layer 1: Decrypt URL Hash layer
  const urlKey = await crypto.subtle.importKey(
    "raw", base64ToBuffer(base64UrlKey), "AES-GCM", true, ["decrypt"]
  );
  
  let decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(base64UrlIv) },
    urlKey,
    base64ToBuffer(base64Ciphertext)
  );

  // Layer 2: Decrypt Password layer if it exists
  if (base64PwdSalt && base64PwdIv) {
    if (!password) throw new Error("PASSWORD_REQUIRED");
    
    const pwdKey = await derivePasswordKey(password, new Uint8Array(base64ToBuffer(base64PwdSalt)));
    decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(base64PwdIv) },
      pwdKey,
      decryptedData
    );
  }

  return new TextDecoder().decode(decryptedData);
}

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
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // We don't need to export this key
    ["encrypt", "decrypt"]
  );
}