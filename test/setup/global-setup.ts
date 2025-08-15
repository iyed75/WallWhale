/**
 * Global test setup - runs once before all tests
 */

import { beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function setup(): Promise<void> {
  console.log("🔧 Setting up global test environment...");

  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret";
  process.env.API_KEY_SALT = "test-salt";
  process.env.STEAM_ACCOUNTS = JSON.stringify([
    {
      name: "test-account",
      username: "testuser",
      password: "base64:dGVzdHBhc3M=",
      displayName: "Test Account",
      status: "ACTIVE",
    },
  ]);
  process.env.SAVE_ROOT = "./test-downloads";
  process.env.DEPOTDOWNLOADER_PATH = "./test-depot-downloader.exe";

  // Setup test database
  try {
    await execAsync("npx prisma migrate reset --force --skip-seed");
    await execAsync("npx prisma generate");
    console.log("✅ Test database setup complete");
  } catch (error) {
    console.error("❌ Failed to setup test database:", error);
    throw error;
  }
}

export async function teardown(): Promise<void> {
  console.log("🧹 Cleaning up global test environment...");

  // Cleanup test database
  try {
    await execAsync("rm -f ./test.db ./test.db-journal");
    console.log("✅ Test database cleanup complete");
  } catch (error) {
    console.warn("⚠️ Failed to cleanup test database:", error);
  }

  // Cleanup test files
  try {
    await execAsync("rm -rf ./test-downloads ./test-results");
    console.log("✅ Test files cleanup complete");
  } catch (error) {
    console.warn("⚠️ Failed to cleanup test files:", error);
  }
}
