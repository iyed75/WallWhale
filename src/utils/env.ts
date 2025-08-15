import "dotenv/config";
import { z } from "zod";

/**
 * Steam Account Configuration Schema
 * Validates Steam account credentials with encrypted password support
 */
const SteamAccount = z.object({
  name: z.string().min(1, "Steam account name is required"),
  username: z.string().min(1, "Steam username is required"),
  password: z.string().min(1, "Steam password is required"), // supports plain or base64:ENCODED
  displayName: z.string().optional(),
  status: z.enum(["ACTIVE", "BANNED", "INACTIVE"]).default("ACTIVE"),
});

/**
 * Application Environment Configuration Schema
 * Comprehensive validation for all environment variables
 */
const EnvSchema = z.object({
  // Application Metadata
  APP_NAME: z.string().default("WallWhale"),
  APP_VERSION: z.string().default("1.0.0"),
  APP_DESCRIPTION: z.string().default("Enterprise-grade WallWhale management API"),

  // Server Configuration
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),

  // Admin Bootstrap
  ADMIN_EMAIL: z.string().email("Invalid admin email format").default("admin@wallwhale.com"),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "Admin password must be at least 8 characters")
    .default("change-me"),

  // Storage Configuration
  SAVE_ROOT: z.string().min(1, "Save root path is required").default("./downloads"),
  REQUIRE_SUBPATH: z.string().default("projects\\myprojects"),

  // DepotDownloader Configuration
  DEPOTDOWNLOADER_PATH: z.string().default("DepotDownloaderMod/DepotDownloaderMod.exe"),

  // Security Configuration
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters").default("dev-secret"),
  API_KEY_SALT: z
    .string()
    .min(16, "API key salt must be at least 16 characters")
    .default("dev-salt"),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  // Network Security
  IP_ALLOW_LIST: z.string().optional(),
  IP_DENY_LIST: z.string().optional(),
  CORS_ORIGINS: z.string().default("*"),

  // TLS Configuration
  TLS_ENABLE: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  TLS_KEY_PATH: z.string().optional(),
  TLS_CERT_PATH: z.string().optional(),

  // Database Configuration
  DATABASE_URL: z.string().url("Invalid database URL").default("file:./prisma/dev.db"),

  // Performance & Concurrency
  GLOBAL_CONCURRENCY: z.coerce.number().min(1).max(100).default(2),
  PER_KEY_CONCURRENCY: z.coerce.number().min(1).max(50).default(1),
  MAX_UPLOAD_SIZE: z.string().default("100MB"),
  REQUEST_TIMEOUT: z.coerce.number().min(1000).max(300000).default(30000),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(100),
  RATE_LIMIT_SKIP_FAILED_REQUESTS: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true")
    .pipe(z.boolean()),

  // Monitoring & Observability
  ENABLE_METRICS: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  ENABLE_HEALTH_CHECKS: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),

  // Redis Configuration (Optional)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).max(15).default(0),

  // Email Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default("noreply@wallwhale.com"),

  // Webhook Configuration
  WEBHOOK_SUCCESS_URL: z.string().url().optional().or(z.literal("")),
  WEBHOOK_FAILURE_URL: z.string().url().optional().or(z.literal("")),
  WEBHOOK_SECRET: z.string().optional(),

  // File Retention Policy
  CLEANUP_INTERVAL: z.coerce.number().min(60000).default(86400000), // 24 hours
  MAX_FILE_AGE: z.coerce.number().min(3600000).default(604800000), // 7 days
  AUTO_CLEANUP_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true")
    .pipe(z.boolean()),

  // API Documentation
  DOCS_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  DOCS_PATH: z.string().default("/docs"),
  DOCS_TITLE: z.string().default("WallWhale API"),
  DOCS_DESCRIPTION: z.string().default("Enterprise API for managing Steam Workshop downloads"),
});

// Helper function to check if we're running a setup command
function isSetupCommand(): boolean {
  const args = process.argv.slice(2);
  return (
    args.includes("setup") ||
    args.includes("quick-setup") ||
    args.includes("check") ||
    args.some((arg) => arg.includes("setup")) ||
    args.some((arg) => arg.includes("cert"))
  );
}

// Validate and export configuration with graceful fallbacks
let parsedEnv: z.infer<typeof EnvSchema>;
let hasEnvironmentIssues = false;

try {
  parsedEnv = EnvSchema.parse(process.env);
} catch (error) {
  hasEnvironmentIssues = true;

  if (error instanceof z.ZodError) {
    const isSetup = isSetupCommand();

    if (isSetup) {
      // For setup commands, show warnings but continue with safe defaults
      console.warn("⚠️  Environment configuration issues detected:");
      error.issues.forEach((err: z.ZodIssue) => {
        console.warn(`  • ${err.path.join(".")}: ${err.message}`);
      });
      console.warn(
        "📝 Using safe defaults for setup. Run the setup wizard to configure properly.\n"
      );

      // Parse with safe defaults by providing minimal required values
      const safeDefaults = {
        ...process.env,
        SAVE_ROOT: process.env.SAVE_ROOT || "./downloads",
        STEAM_ACCOUNTS: process.env.STEAM_ACCOUNTS || "",
        JWT_SECRET: process.env.JWT_SECRET || "dev-setup-secret-" + Math.random().toString(36),
        API_KEY_SALT: process.env.API_KEY_SALT || "dev-setup-salt-" + Math.random().toString(36),
      };

      try {
        parsedEnv = EnvSchema.parse(safeDefaults);
      } catch (fallbackError) {
        // If still failing, use the most minimal defaults
        parsedEnv = {
          APP_NAME: "WallWhale",
          APP_VERSION: "1.0.0",
          APP_DESCRIPTION: "Enterprise-grade WallWhale management API",
          PORT: 3000,
          HOST: "0.0.0.0",
          NODE_ENV: "development" as const,
          ADMIN_EMAIL: "admin@wallwhale.com",
          ADMIN_PASSWORD: "change-me",
          SAVE_ROOT: "./downloads",
          REQUIRE_SUBPATH: "projects\\myprojects",
          DEPOTDOWNLOADER_PATH: "DepotDownloaderMod/DepotDownloaderMod.exe",
          JWT_SECRET: "dev-setup-secret-" + Math.random().toString(36),
          API_KEY_SALT: "dev-setup-salt-" + Math.random().toString(36),
          BCRYPT_ROUNDS: 12,
          DATABASE_URL: "file:./data/depot.db",
          STEAM_ACCOUNTS: "",
          STEAM_ACCOUNT_CYCLE: false,
          TLS_ENABLE: false,
          TLS_CERT_PATH: "./certs/cert.pem",
          TLS_KEY_PATH: "./certs/key.pem",
          DOCS_ENABLED: true,
          DOCS_TITLE: "WallWhale API",
          DOCS_DESCRIPTION: "Enterprise Steam Workshop management API",
          DOCS_PATH: "/docs",
          ENABLE_METRICS: true,
          ENABLE_HEALTH_CHECKS: true,
          AUTO_CLEANUP_ENABLED: true,
          CLEANUP_INTERVAL_HOURS: 24,
          CLEANUP_MAX_AGE_HOURS: 168,
          RATE_LIMIT_MAX: 100,
          RATE_LIMIT_WINDOW: 60000,
          RATE_LIMIT_SKIP_FAILED_REQUESTS: false,
          MAX_UPLOAD_SIZE: "100MB",
          REQUEST_TIMEOUT: 30000,
          GLOBAL_CONCURRENCY: 3,
          PER_KEY_CONCURRENCY: 1,
          LOG_LEVEL: "info" as const,
          LOG_FORMAT: "pretty" as const,
          CORS_ORIGINS: "*",
          API_PREFIX: "/api/v1",
          DEV_AUTO_OPEN_BROWSER: false,
          REDIS_DB: 0,
          SMTP_PORT: 587,
          SMTP_FROM: "noreply@wallwhale.com",
          CLEANUP_INTERVAL: 86400000,
          MAX_FILE_AGE: 604800000,
        } as z.infer<typeof EnvSchema>;
      }
    } else {
      // For non-setup commands, show error and exit as before
      const errorMessage = error.issues
        .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      console.error("❌ Environment validation failed:");
      console.error(errorMessage);
      console.error("\n💡 Run 'npm run setup' to configure your environment properly.");
      process.exit(1);
    }
  } else {
    throw error;
  }
}

export const env = parsedEnv;

// Export flag to check if environment has issues
export const environmentIssues = hasEnvironmentIssues;

// Type exports
export type SteamAccount = z.infer<typeof SteamAccount>;
export type Environment = z.infer<typeof EnvSchema>;

/**
 * Decodes a password that may be base64 encoded
 * @param pw - Password string (plain or base64:ENCODED)
 * @returns Decoded password
 */
export function decodePassword(pw: string): string {
  if (pw.startsWith("base64:")) {
    const b64 = pw.substring("base64:".length);
    try {
      return Buffer.from(b64, "base64").toString("utf-8");
    } catch (error) {
      throw new Error(`Failed to decode base64 password: ${error}`);
    }
  }
  return pw;
}

/**
 * Shows environment configuration warnings if there are issues
 */
export function showEnvironmentWarnings(): void {
  if (hasEnvironmentIssues) {
    console.warn("⚠️  Environment configuration needs attention!");
    console.warn("   Run 'npm run setup' to configure properly.");
    console.warn("");
  }
}

/**
 * Validates that required configuration is present for production
 */
export function validateProductionConfig(): void {
  if (env.NODE_ENV === "production") {
    const requiredSecrets = [
      { key: "JWT_SECRET", value: env.JWT_SECRET },
      { key: "API_KEY_SALT", value: env.API_KEY_SALT },
    ];

    const missingSecrets = requiredSecrets.filter(
      ({ key, value }) => value === "dev-secret" || value === "dev-salt" || value === "change-me"
    );

    if (missingSecrets.length > 0) {
      console.error("❌ Production secrets not configured:");
      missingSecrets.forEach(({ key }) => console.error(`  - ${key}`));
      process.exit(1);
    }

    if (env.TLS_ENABLE && (!env.TLS_KEY_PATH || !env.TLS_CERT_PATH)) {
      console.error("❌ TLS enabled but certificate paths not configured");
      process.exit(1);
    }
  }
}

/**
 * Get CORS origins as array
 */
export function getCorsOrigins(): string[] | boolean {
  if (env.CORS_ORIGINS === "*") {
    return true;
  }
  return env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
}

/**
 * Environment configuration summary for logging
 */
export function getConfigSummary() {
  return {
    app: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
    },
    server: {
      host: env.HOST,
      port: env.PORT,
      tls: env.TLS_ENABLE,
    },
    features: {
      metrics: env.ENABLE_METRICS,
      healthChecks: env.ENABLE_HEALTH_CHECKS,
      documentation: env.DOCS_ENABLED,
      autoCleanup: env.AUTO_CLEANUP_ENABLED,
    },
    limits: {
      globalConcurrency: env.GLOBAL_CONCURRENCY,
      perKeyConcurrency: env.PER_KEY_CONCURRENCY,
      rateLimit: `${env.RATE_LIMIT_MAX}/${env.RATE_LIMIT_WINDOW}ms`,
      requestTimeout: `${env.REQUEST_TIMEOUT}ms`,
    },
  };
}
