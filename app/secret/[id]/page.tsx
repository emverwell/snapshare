// app/secret/[id]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { decryptSecret } from "@/lib/crypto";

export default function ViewSecret({ 
  params: paramsPromise 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. Unwrap the params Promise using React.use()
  const params = use(paramsPromise);

  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [encryptedPayload, setEncryptedPayload] = useState<any>(null);

  useEffect(() => {
    async function fetchPayload() {
      // Extract key from URL hash (e.g., domain.com/secret/id#HASH_KEY)
      const base64Key = window.location.hash.slice(1);
      if (!base64Key) return setError("Decryption key missing from URL.");

      // Fetch ciphertext using unwrapped params.id
      const res = await fetch(`/api/secret/${params.id}`);
      if (!res.ok) return setError("Secret burned or not found.");
      
      const payload = await res.json();
      setEncryptedPayload({ ...payload, base64Key });
      
      attemptDecryption(payload, base64Key);
    }
    fetchPayload();
  }, [params.id]);

  const attemptDecryption = async (payload: any, key: string, pwd?: string) => {
    try {
      const plaintext = await decryptSecret(
        payload.ciphertext, 
        key, 
        payload.urlIv, 
        pwd, 
        payload.pwdSalt, 
        payload.pwdIv
      );
      setSecret(plaintext);
      setNeedsPassword(false);
      setError(null);
    } catch (err: any) {
      if (err.message === "PASSWORD_REQUIRED" || payload.pwdSalt) {
        setNeedsPassword(true);
        if (pwd) setError("Incorrect password.");
      } else {
        setError("Failed to decrypt. Link may be invalid.");
      }
    }
  };

  if (error && !needsPassword) return <div className="text-red-500 p-4">{error}</div>;
  
  if (needsPassword && !secret) {
    return (
      <div className="p-4 border border-gray-700 rounded max-w-xl mx-auto mt-12 space-y-4">
        <p className="font-medium">This secret is password protected.</p>
        <input 
          type="password" 
          placeholder="Enter password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          className="w-full p-2 border rounded bg-transparent border-gray-700 text-white"
        />
        <button 
          onClick={() => attemptDecryption(encryptedPayload, encryptedPayload.base64Key, passwordInput)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 font-semibold rounded text-white"
        >
          Decrypt Secret
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (!secret) return <div className="p-4 max-w-xl mx-auto mt-12">Fetching & decrypting...</div>;
  
  return (
    <div className="p-4 border border-gray-700 rounded max-w-xl mx-auto mt-12">
      <h2 className="font-bold text-lg mb-2">Your Secret (Burned from server):</h2>
      <pre className="p-3 bg-black/50 border border-gray-800 rounded whitespace-pre-wrap break-all text-sm">
        {secret}
      </pre>
    </div>
  );
}