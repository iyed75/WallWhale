import { PrismaClient, Role } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { encryptPassword, decryptPassword } from "../src/utils/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "change-me";

  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    admin = await prisma.user.create({
      data: { email, password, role: Role.ADMIN },
    });
    console.log("Created admin:", email);
  }

  // Create a bootstrap API key
  const key = "adm_" + randomBytes(24).toString("base64url");
  const created = await prisma.apiKey.upsert({
    where: { key },
    update: {},
    create: {
      key,
      name: "bootstrap-admin",
      ownerId: admin.id,
      scopes: { create: [{ name: "admin:*" }, { name: "download:*" }] },
      rateLimit: 120,
      maxConcurrent: 2,
    },
  });
  console.log("Admin API key:", created.key);

  // --- Load and seed SteamUser accounts from accounts.safe file ---
  function loadAccountsFromFile(): Record<string, string> {
    const accountsPath = join(process.cwd(), "accounts.safe");

    if (!existsSync(accountsPath)) {
      console.log("No accounts.safe file found, skipping Steam account seeding");
      console.log(
        "Create accounts.safe file with format: username:encrypted_password (one per line)"
      );
      console.log("Use 'npm run accounts:encode' to encrypt passwords from accounts.template");
      return {};
    }

    try {
      const content = readFileSync(accountsPath, "utf-8");
      const accounts: Record<string, string> = {};

      for (const line of content.split("\n")) {
        const trimmedLine = line.trim();
        // Skip empty lines and comments
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
          accounts[username.trim()] = encryptedPassword.trim();
        }
      }

      console.log(`Loaded ${Object.keys(accounts).length} accounts from accounts.safe`);
      return accounts;
    } catch (error) {
      console.error("Error reading accounts.safe file:", error);
      return {};
    }
  }

  const accounts = loadAccountsFromFile();

  for (const [username, encryptedPasswordFromFile] of Object.entries(accounts)) {
    try {
      // The password from accounts.safe is already properly encrypted, use it directly
      // No need for double encryption - accounts.safe contains AES-256-GCM encrypted passwords
      await prisma.steamUser.upsert({
        where: { username },
        update: { name: username, encryptedPassword: encryptedPasswordFromFile },
        create: { name: username, username, encryptedPassword: encryptedPasswordFromFile },
      });
      console.log(`Seeded SteamUser: ${username}`);
    } catch (error) {
      console.error(`Failed to process account ${username}:`, error.message);
      console.log(
        "This might be an old base64 format. Use 'npm run accounts:decode' then 'npm run accounts:encode' to migrate."
      );
    }
  }
}

main().finally(() => prisma.$disconnect());
