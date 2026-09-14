# 1. Encrypt and decrypt client-side; the server never sees a key or plaintext

## Status

Accepted

## Context

Snapshare's whole job is to move a secret from one person to another without
a third party (including us) being able to read it in transit or at rest.
There are two broad ways to build that:

- **Server-side encryption**: the browser sends plaintext over TLS, the
  server encrypts it before writing to storage, and decrypts it again on
  read. TLS termination and the application process both see the plaintext
  at some point.
- **Client-side encryption**: the browser encrypts before the plaintext ever
  leaves it, and the server only ever handles ciphertext.

## Decision

All encryption and decryption happens in the browser via the Web Crypto API
(AES-256-GCM). The server (Next.js route handlers + Upstash Redis) only ever
stores and returns ciphertext, an IV, and — in one mode — a KDF salt. It
never receives a key or a passphrase.

Two mutually exclusive key-delivery modes exist, chosen by whether the
sender sets a passphrase:

- **url-key**: a random AES-256 key is generated in the browser and appended
  to the share link's URL *fragment* (`#...`). Fragments are never sent to
  any server by the browser (they're stripped before the HTTP request is
  made), so the key genuinely never transits the network after the link is
  created. The recipient's browser reads it straight out of
  `window.location.hash`.
- **passphrase**: the sender supplies a passphrase; the browser derives an
  AES-256 key from it via PBKDF2 (600,000 iterations, SHA-256) with a random
  salt. The server stores the salt and ciphertext, never the passphrase or
  the derived key. The link alone cannot decrypt the secret — chat apps and
  link previewers that strip URL fragments are a real threat model here, and
  this mode carries no key in the link at all.

These two modes are mutually exclusive by design (see
`lib/secret-guard.ts`'s `validateSecretPayload`), not stacked: a passphrase
*replaces* the URL key rather than adding a second layer on top of it.
Stacking would suggest the passphrase adds defense-in-depth over a key the
link still carries — it doesn't, since anyone with the link already has the
key in url-key mode. The honest model is "pick one."

## Consequences

- A full compromise of the storage layer (an Upstash data dump, a Redis
  misconfiguration, a Vercel account breach) exposes only ciphertext, IVs,
  and salts — never a plaintext secret or a usable key. There is no
  server-side secret to leak because the server never held one.
- There is no server-side key management, rotation, or KMS integration to
  build or operate — the browser is the only place a key ever exists, and
  only for the lifetime of one page load.
- The tradeoff is unrecoverability: if the URL fragment is lost, or a
  passphrase is forgotten, the secret is gone. There is no "reset" or
  "recover" flow, and there can't be one without moving key custody to the
  server — which is exactly the property this design refuses to trade away.
- Passphrase strength is the *only* defense against offline brute force once
  an attacker has fetched a payload once (a single GET returns ciphertext +
  salt; everything after that is offline and outside the server's rate
  limiter entirely). PBKDF2's iteration count is the main lever available to
  slow that down, which is why it's set well above the minimum commonly seen
  in the wild rather than left at a legacy default.
