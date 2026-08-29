// app/page.tsx
"use client";

import { useState } from "react";
import { encryptSecret } from "@/lib/crypto";

export default function Home() {
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;

    setLoading(true);
    setShareUrl(null);

    try {
      // 1. Encrypt secret client-side before sending to server
      const {
        base64UrlKey,
        base64UrlIv,
        base64Ciphertext,
        base64PwdSalt,
        base64PwdIv,
      } = await encryptSecret(secret, password || undefined);

      // 2. Send only ciphertext and metadata to Redis
      const res = await fetch("/api/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: base64Ciphertext,
          urlIv: base64UrlIv,
          pwdSalt: base64PwdSalt,
          pwdIv: base64PwdIv,
        }),
      });

      if (!res.ok) throw new Error("Failed to store secret.");

      const { id } = await res.json();

      // 3. Assemble link with encryption key in hash fragment (#)
      // Hash fragments are NEVER sent to the server in HTTP requests
      const origin = window.location.origin;
      const generatedUrl = `${origin}/secret/${id}#${base64UrlKey}`;

      setShareUrl(generatedUrl);
      setSecret("");
      setPassword("");
    } catch (err) {
      console.error(err);
      alert("An error occurred while creating the secret.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="max-w-xl mx-auto p-6 mt-12">
      <h1 className="text-2xl font-bold mb-4">Share a Secret</h1>
      <p className="text-gray-400 mb-6 text-sm">
        Data is encrypted in your browser using AES-GCM. The encryption key never hits the server.
      </p>

      {!shareUrl ? (
        <form onSubmit={handleCreateSecret} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Secret / Key / Token</label>
            <textarea
              required
              rows={4}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Paste your sensitive data here..."
              className="w-full p-2 border rounded bg-transparent border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Optional Password <span className="text-gray-500">(Adds double-layer encryption)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for link-only protection"
              className="w-full p-2 border rounded bg-transparent border-gray-700 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 font-semibold rounded text-white disabled:opacity-50"
          >
            {loading ? "Encrypting & Storing..." : "Generate One-Time Link (24h Max)"}
          </button>
        </form>
      ) : (
        <div className="p-4 border border-green-800 rounded bg-green-950/20 space-y-4">
          <p className="font-semibold text-green-400">Secret stored successfully!</p>
          <p className="text-xs text-gray-400">
            This link can only be viewed ONCE. It will burn immediately after decryption or expire in 24 hours.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              type="text"
              value={shareUrl}
              className="flex-1 p-2 border rounded text-sm bg-black/50 border-gray-700 text-gray-300"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setShareUrl(null)}
            className="text-xs text-gray-400 underline hover:text-white"
          >
            Create another secret
          </button>
        </div>
      )}
    </main>
  );
}