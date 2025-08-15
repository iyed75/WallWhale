/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Global setup and teardown
    globalSetup: ["./test/setup/global-setup.ts"],
    setupFiles: ["./test/setup/test-setup.ts"],

    // Test file patterns
    include: ["test/**/*.{test,spec}.{js,ts}", "src/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", "coverage", "**/*.d.ts"],

    // Test categorization
    testMatch: [
      "**/test/unit/**/*.{test,spec}.{js,ts}",
      "**/test/integration/**/*.{test,spec}.{js,ts}",
      "**/test/e2e/**/*.{test,spec}.{js,ts}",
    ],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "clover"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "test/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/index.ts",
        "src/types/",
        "prisma/",
        "scripts/",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      all: true,
      clean: true,
    },

    // Test execution
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // Watch mode
    watch: false,
    watchExclude: ["node_modules/**", "dist/**", "coverage/**"],

    // Reporter configuration
    reporter: ["verbose", "junit", "json", "html"],
    outputFile: {
      junit: "./test-results/junit.xml",
      json: "./test-results/results.json",
      html: "./test-results/html/index.html",
    },

    // Test isolation
    isolate: true,
    passWithNoTests: false,

    // Snapshot configuration
    resolveSnapshotPath: (testPath, snapExtension) => {
      return resolve(
        testPath.replace(/\.test\./, ".snap."),
        "..",
        "__snapshots__",
        `${testPath.split("/").pop()}${snapExtension}`
      );
    },
  },

  // Path resolution
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/types": resolve(__dirname, "./src/types"),
      "@/utils": resolve(__dirname, "./src/utils"),
      "@/services": resolve(__dirname, "./src/services"),
      "@/plugins": resolve(__dirname, "./src/plugins"),
      "@/routes": resolve(__dirname, "./src/routes"),
      "@/test": resolve(__dirname, "./test"),
    },
  },

  // Define configuration for different test types
  define: {
    "import.meta.vitest": "undefined",
  },

  // ESBuild configuration
  esbuild: {
    target: "node18",
  },
});
