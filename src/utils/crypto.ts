import "dotenv/config"; // Load environment variables
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

// Derive a key from the environment secret
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || "dev-encryption-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

export function encryptPassword(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptPassword(encrypted: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encrypted.split(":");

    if (parts.length === 3) {
      // New format: iv:authTag:encrypted
      const ivHex = parts[0];
      const authTagHex = parts[1];
      const encryptedText = parts[2];

      if (!ivHex || !authTagHex || !encryptedText) {
        throw new Error("Invalid encrypted format");
      }

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } else {
      // Fallback: treat as base64 for migration from old format
      return Buffer.from(encrypted, "base64").toString("utf-8");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decrypt password: ${message}`);
  }
}
