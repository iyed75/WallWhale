/**
 * Test setup - runs before each test file
 */

import { beforeEach, afterEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

// Mock console methods to reduce noise during tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

beforeEach(() => {
  // Clear all mocks and timers
  vi.clearAllMocks();
  vi.clearAllTimers();

  // Mock console methods for cleaner test output
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});

  // Mock Date for consistent testing
  vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

  // Mock critical environment variables
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "file:./test.db");
  // Use sufficiently long secrets to pass validation (min lengths: JWT 32, SALT 16)
  vi.stubEnv("JWT_SECRET", "test-secret-key-for-testing-0123456789");
  vi.stubEnv("API_KEY_SALT", "test-salt-for-testing-0123");
  vi.stubEnv("SAVE_ROOT", "./test-downloads");
  vi.stubEnv(
    "STEAM_ACCOUNTS",
    JSON.stringify([
      {
        name: "test-account",
        username: "testuser",
        password: "base64:dGVzdHBhc3M=",
        displayName: "Test Account",
        status: "ACTIVE",
      },
    ])
  );
  vi.stubEnv("DEPOTDOWNLOADER_PATH", "./test-depot-downloader.exe");
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;

  // Restore timers
  vi.useRealTimers();

  // Restore environment
  vi.unstubAllEnvs();

  // Clear all mocks
  vi.restoreAllMocks();
});

// Test utilities
export const createMockPrismaClient = (): Partial<PrismaClient> => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as any,
  apiKey: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as any,
  download: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as any,
  steamUser: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as any,
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  } as any,
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
});

// Export test utilities
export { vi };
