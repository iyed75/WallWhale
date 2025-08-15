# Crypto utilities (src/utils/crypto.ts)

This document explains the encryption utilities implemented in `src/utils/crypto.ts`.

## Purpose

The module provides simple encrypt/decrypt helpers used for storing sensitive strings (e.g. third-party passwords) with authenticated symmetric encryption.

Files / functions covered
- `encryptPassword(plaintext: string): string` — encrypts a UTF-8 string and returns a compact serialized value.
- `decryptPassword(encrypted: string): string` — decrypts values produced by `encryptPassword` and also supports an older Base64 fallback.

## Cryptography details

- Algorithm: AES-256-GCM (authenticated encryption with associated data omitted).
- Key derivation: SHA-256 of the environment value `ENCRYPTION_SECRET` (or `process.env.ENCRYPTION_SECRET`).
  - If `ENCRYPTION_SECRET` is not set a development fallback `dev-encryption-secret-change-me` is used. **Do not use the fallback in production.**
- IV (nonce): 16 random bytes generated per-encryption via `crypto.randomBytes(16)`.
- Auth tag: retrieved from the cipher using `cipher.getAuthTag()`; included in the serialized payload.

## Serialized format

The encrypted output is a single string with three hex-encoded parts separated by colons:

iv_hex:authTag_hex:ciphertext_hex

Example (pseudo):

```
0a1b2c3d...:9f8e7d6c...:aabbccddeeff...
```

Notes:
- IV and auth tag are hex-encoded and required for decryption. If any part is missing, decryption will fail.

## Backwards compatibility / migration

`decryptPassword` contains a fallback branch: if the input does not split into 3 colon-separated parts, the code attempts to treat the input as a Base64 encoded plaintext (old format). This supports gradual migration from older storage formats.

If you have existing stored values in Base64 (old format), you can migrate them to the new AES-GCM format by:

1. Decrypting the old value using `decryptPassword` (the fallback will decode Base64).
2. Re-encrypting using `encryptPassword`.
3. Persisting the new string in place of the old value.

Important: perform this migration in a controlled batch and keep backups. Make sure the running app has the same `ENCRYPTION_SECRET` while migrating.

## Usage examples

Minimal example in Node/TypeScript:

```ts
import { encryptPassword, decryptPassword } from "../src/utils/crypto";

// set process.env.ENCRYPTION_SECRET (in production use a secret manager / env var)
process.env.ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "your-very-long-secret-here-change-me";

const secret = "my-super-secret";
const boxed = encryptPassword(secret);
console.log("stored:", boxed);

const plain = decryptPassword(boxed);
console.log("plain:", plain);
```

Example output (illustrative only):

```
stored: 1f2e3d4c...:a1b2c3d4...:9f8e7d6c...
plain: my-super-secret
```

## Error handling

- If decryption fails (bad key, tampered data, truncated parts, or wrong format), `decryptPassword` throws an Error with the message `Failed to decrypt password: <reason>`.
- The code intentionally catches underlying crypto errors and surfaces a normalized error. Calling code should treat failures as unrecoverable for that value and handle them (log, alert, skip, or prompt for re-entry) depending on context.

## Operational and security recommendations

- Rotate `ENCRYPTION_SECRET` using a careful migration strategy: keep the old secret available to decrypt existing records, re-encrypt with the new secret, then remove the old secret.
- Use a high-entropy secret stored in a secrets manager (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, etc.).
- Never commit `ENCRYPTION_SECRET` to source code. Avoid short or guessable values.
- Use HTTPS and proper access controls wherever encrypted values transit or are displayed.
- Protect backups containing the encrypted values; although AES-GCM provides confidentiality and integrity, key compromise equals value compromise.

## Edge cases & notes

- IV size: the code uses 16-byte IV (128-bit). AES-GCM allows 12-byte or other IV lengths; 12 bytes is recommended by NIST for performance and nonce uniqueness, but 16 bytes is fine if securely random. Do not reuse IVs with the same key.
- No Additional Authenticated Data (AAD) is used — consider using AAD if you need to bind other context (e.g., record IDs) to the ciphertext.
- The code uses SHA-256 of `ENCRYPTION_SECRET` as a simple KDF. For stronger key derivation (e.g., when secret is low-entropy), consider using HKDF or PBKDF2/Argon2 with a salt.

## Where this is used

Search the codebase for `encryptPassword` / `decryptPassword` to find callers (examples: storing credentials for external services). Ensure those code paths handle errors and migration behavior appropriately.

---

If you'd like, I can:

- Add an entry in `docs/SECURITY.md` summarizing runtime requirements for `ENCRYPTION_SECRET`.
- Prepare a small migration script to convert Base64-stored secrets to the new format (tested and safe for the repo).

Pick the next file you want documented and I'll repeat this process file-by-file.
