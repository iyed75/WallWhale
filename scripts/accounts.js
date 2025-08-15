#!/usr/bin/env node
/**
 * Account Management Utility
 * 
 * This script helps convert between unencrypted account templates and encrypted accounts.safe files
 * 
 * Usage:
 * - node scripts/accounts.js encode    # Convert accounts.template to accounts.safe (AES encrypt passwords)
 * - node scripts/accounts.js decode    # Convert accounts.safe to accounts.template (AES decrypt passwords)
 */

import "dotenv/config"; // Load environment variables
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const TEMPLATE_FILE = "accounts.template";
const SAFE_FILE = "accounts.safe";
const ALGORITHM = "aes-256-gcm";

// Derive a key from the environment secret (same as the app)
function getEncryptionKey() {
    const secret = process.env.ENCRYPTION_SECRET || "dev-encryption-secret-change-me";
    return createHash("sha256").update(secret).digest();
}

function encryptPassword(plaintext) {
    const key = getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptPassword(encrypted) {
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
        throw new Error(`Failed to decrypt password: ${error.message}`);
    }
}

function encodePasswords() {
    const templatePath = join(process.cwd(), TEMPLATE_FILE);

    if (!existsSync(templatePath)) {
        console.error(`${TEMPLATE_FILE} not found!`);
        console.log("Create the template file first with format: username:password");
        process.exit(1);
    }

    try {
        const content = readFileSync(templatePath, "utf-8");
        const encodedLines = [];

        for (const line of content.split("\n")) {
            const trimmedLine = line.trim();

            // Keep comments and empty lines as-is
            if (!trimmedLine || trimmedLine.startsWith("#")) {
                continue; // Skip comments when encoding to safe file
            }

            const [username, password] = trimmedLine.split(":");
            if (username && password) {
                const encryptedPassword = encryptPassword(password.trim());
                encodedLines.push(`${username.trim()}:${encryptedPassword}`);
            }
        }

        const safePath = join(process.cwd(), SAFE_FILE);
        writeFileSync(safePath, encodedLines.join("\n"));
        console.log(`✅ Encrypted ${encodedLines.length} accounts to ${SAFE_FILE}`);
        console.log("🔐 Passwords are now AES-256-GCM encrypted with authentication");

    } catch (error) {
        console.error("Error encrypting passwords:", error);
        process.exit(1);
    }
}

function decodePasswords() {
    const safePath = join(process.cwd(), SAFE_FILE);

    if (!existsSync(safePath)) {
        console.error(`${SAFE_FILE} not found!`);
        process.exit(1);
    }

    try {
        const content = readFileSync(safePath, "utf-8");
        const decodedLines = [
            "# Steam Accounts Template",
            "# Format: username:password (one per line)",
            "# This file contains PLAIN TEXT passwords - keep it secure!",
            "# Use 'node scripts/accounts.js encode' to convert back to accounts.safe",
            ""
        ];

        let successCount = 0;
        let errorCount = 0;

        for (const line of content.split("\n")) {
            const trimmedLine = line.trim();

            if (!trimmedLine || trimmedLine.startsWith("#")) {
                continue;
            }

            // Find the first colon to separate username from encrypted data
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex === -1) {
                console.warn(`Warning: Invalid line format: ${trimmedLine}`);
                continue;
            }

            const username = trimmedLine.substring(0, colonIndex);
            const encryptedPassword = trimmedLine.substring(colonIndex + 1);

            if (username && encryptedPassword) {
                try {
                    const plainPassword = decryptPassword(encryptedPassword.trim());
                    decodedLines.push(`${username.trim()}:${plainPassword}`);
                    successCount++;
                } catch (err) {
                    console.warn(`Warning: Could not decrypt password for ${username}: ${err.message}`);
                    decodedLines.push(`${username.trim()}:DECRYPT_ERROR`);
                    errorCount++;
                }
            }
        }

        const templatePath = join(process.cwd(), TEMPLATE_FILE);
        writeFileSync(templatePath, decodedLines.join("\n"));
        console.log(`✅ Decrypted ${successCount} accounts to ${TEMPLATE_FILE}`);
        if (errorCount > 0) {
            console.warn(`⚠️  ${errorCount} accounts failed to decrypt`);
        }
        console.warn("⚠️  WARNING: Template file contains plain text passwords!");

    } catch (error) {
        console.error("Error decrypting passwords:", error);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
Account Management Utility

Usage:
  node scripts/accounts.js encode    # Convert accounts.template to accounts.safe (AES encrypt)
  node scripts/accounts.js decode    # Convert accounts.safe to accounts.template (AES decrypt)
  node scripts/accounts.js help      # Show this help

Files:
  accounts.template  - Plain text format (username:password) - for editing/sharing
  accounts.safe      - AES-256-GCM encrypted format - used by app

Security Features:
  🔐 AES-256-GCM encryption with authentication
  🔑 Key derivation from ENCRYPTION_SECRET environment variable
  🛡️ IV randomization for each password
  ✅ Authentication tags prevent tampering

Environment:
  ENCRYPTION_SECRET  - Master key for encryption (set in .env file)
                      Default: "dev-encryption-secret-change-me"

Security Notes:
  - Keep accounts.safe in your project (encrypted passwords)
  - Share accounts.template only with trusted people (plain text passwords)
  - Add accounts.template to .gitignore if it contains real passwords
  - Change ENCRYPTION_SECRET in production environments
  - Backup your ENCRYPTION_SECRET - lost keys = lost passwords!
`);
}

const command = process.argv[2];

switch (command) {
    case "encode":
        encodePasswords();
        break;
    case "decode":
        decodePasswords();
        break;
    case "help":
    case "--help":
    case "-h":
        showHelp();
        break;
    default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
}
