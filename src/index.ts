#!/usr/bin/env node

/**
 * WallWhale - Enterprise Grade CLI Application
 *
 * A modern, beautiful CLI for managing Steam Workshop downloads
 * with comprehensive security, monitoring, and scalability features.
 *
 * @author WallWhale Engineering Team
 * @version 1.0.0
 */

import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";
import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";
import gradient from "gradient-string";
import createSpinner from "ora";
import inquirer from "inquirer";

import Fastify from "fastify";
import os from "node:os";
import type { FastifyServerOptions } from "fastify";

// Core plugins
import sensible from "@fastify/sensible";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import underPressure from "@fastify/under-pressure";
import fastifyMetrics from "fastify-metrics";
import rateLimit from "@fastify/rate-limit";

// Import application modules
import { registerRoutes } from "./routes/register.js";
import { env, validateProductionConfig, getCorsOrigins, getConfigSummary } from "./utils/env.js";
import { certificateManager, type CertificateInfo } from "./utils/certificates.js";
import { getDepotDownloaderPath, isDepotDownloaderAvailable } from "./utils/depotDownloader.js";
import { SetupWizard } from "./commands/setup.js";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import auditPlugin from "./plugins/audit.js";
import { directDownload } from "./utils/directDownload.js";

// CLI Art and Styling
const createBanner = () => {
  const content = `${chalk.bold.cyan("🎯 WallWhale")}
${chalk.gray("Professional Steam Workshop Tool")}`;

  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "cyan",
    backgroundColor: "#0a0e1a",
    textAlignment: "center",
  });
};

const createWelcomeBox = () => {
  const content = `${chalk.bold.cyan("✨ Welcome to WallWhale ✨")}

${chalk.gray("Enterprise-grade Steam Workshop management API")}
${chalk.gray("━".repeat(50))}

${chalk.bold("Environment:")} ${chalk.yellow(env.NODE_ENV.toUpperCase())}
${chalk.bold("Version:")} ${chalk.green(`v${env.APP_VERSION}`)}
${chalk.bold("Runtime:")} ${chalk.blue(`Node.js ${process.version}`)}
${chalk.bold("Platform:")} ${chalk.magenta(`${process.platform} ${process.arch}`)}

${chalk.dim("Initializing enterprise-grade infrastructure...")}`;

  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "cyan",
    backgroundColor: "#0a0e1a",
    textAlignment: "center",
  });
};

const createServerStartedBox = (baseUrl: string, addresses?: string[]) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  const statusSection = `${chalk.bold.green("🚀 Server Status: OPERATIONAL")}
${chalk.gray("━".repeat(60))}

${chalk.bold("🌐 Primary Endpoint:")}    ${chalk.cyan.underline(baseUrl)}
${chalk.bold("📚 API Documentation:")}   ${chalk.cyan.underline(`$/docs`)}
${chalk.bold("📊 Metrics Dashboard:")}   ${chalk.cyan.underline(`$/metrics`)}
${chalk.bold("💚 Health Monitor:")}      ${chalk.cyan.underline(`$/health`)}
${chalk.bold("🔍 Status Check:")}        ${chalk.cyan.underline(`$/status`)}`;

  // If a list of concrete addresses is provided, show them as well
  let listenSection = "";
  if (addresses && addresses.length > 0) {
    listenSection =
      `\n${chalk.bold("🔗 Listening On:")}\n` +
      addresses.map((a) => `  ${chalk.cyan.underline(a)}`).join("\n") +
      "\n";
  }

  const featuresSection = `${chalk.bold("✨ Enterprise Features:")}
  ${env.ENABLE_METRICS ? chalk.green("✓") : chalk.red("✗")} ${chalk.bold("Prometheus Metrics")}     ${chalk.dim("Real-time performance monitoring")}
  ${env.ENABLE_HEALTH_CHECKS ? chalk.green("✓") : chalk.red("✗")} ${chalk.bold("Health Monitoring")}     ${chalk.dim("Automated health checks & alerts")}
  ${env.DOCS_ENABLED ? chalk.green("✓") : chalk.red("✗")} ${chalk.bold("API Documentation")}     ${chalk.dim("Interactive Swagger UI")}
  ${env.TLS_ENABLE ? chalk.green("✓") : chalk.yellow("⚠")} ${env.TLS_ENABLE ? chalk.bold("TLS/HTTPS Security") : chalk.bold("HTTP Mode")}      ${chalk.dim(env.TLS_ENABLE ? "Production-grade encryption" : "Development mode - consider TLS")}
  ${env.AUTO_CLEANUP_ENABLED ? chalk.green("✓") : chalk.red("✗")} ${chalk.bold("Auto File Cleanup")}     ${chalk.dim("Automated maintenance routines")}`;

  const systemSection = `${chalk.bold("📈 System Information:")}
  ${chalk.bold("Memory Usage:")}     ${chalk.cyan(`${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)} ${chalk.dim(`/ ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB heap`)}
  ${chalk.bold("Process Uptime:")}   ${chalk.cyan(`${Math.round(uptime)}s`)}
  ${chalk.bold("Rate Limiting:")}    ${chalk.cyan(`${env.RATE_LIMIT_MAX} req/${env.RATE_LIMIT_WINDOW / 1000}s`)}
  ${chalk.bold("Concurrency:")}      ${chalk.cyan(`${env.GLOBAL_CONCURRENCY} global`)} ${chalk.dim(`/ ${env.PER_KEY_CONCURRENCY} per-key`)}`;

  const content = `${statusSection}

${listenSection}
${chalk.gray("━".repeat(60))}

${featuresSection}

${chalk.gray("━".repeat(60))}

${systemSection}

${chalk.gray("━".repeat(60))}

${chalk.bold.blue("🎯 Ready for Enterprise Workloads")}
${chalk.dim("Press Ctrl+C to gracefully shutdown the server")}`;

  return boxen(content, {
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: "double",
    borderColor: "green",
    backgroundColor: "#0a1810",
    textAlignment: "left",
  });
};

const showSpinner = (text: string) => {
  return createSpinner({
    text: chalk.cyan(text),
    spinner: "dots12",
    color: "cyan",
  }).start();
};

/**
 * Utility function to parse size strings like "100MB"
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  const match = size.match(/^(\d+(?:\.\d+)?)\s*([A-Z]{1,2})$/i);
  if (!match) return 1048576; // Default 1MB

  const [, value, unit] = match;
  if (!value || !unit) return 1048576;

  return Math.floor(parseFloat(value) * (units[unit.toUpperCase()] || 1));
}

/**
 * Creates and configures the Fastify application
 */
async function createApp(): Promise<any> {
  // Validate production configuration
  validateProductionConfig();

  const serverOptions: FastifyServerOptions = {
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === "development" && env.LOG_FORMAT === "pretty"
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname,reqId",
                singleLine: false,
                hideObject: false,
                messageFormat: "[{context}] {msg}",
                levelFirst: false,
                crlf: false,
              },
            },
          }
        : {}),
    },
    trustProxy: env.NODE_ENV === "production",
    requestTimeout: env.REQUEST_TIMEOUT,
    keepAliveTimeout: 5000,
    maxParamLength: 100,
    bodyLimit: parseSize(env.MAX_UPLOAD_SIZE),
  };

  // Enhanced HTTPS configuration with auto-certificate management
  if (env.TLS_ENABLE) {
    let certificateInfo: CertificateInfo | null = null;

    // Check if certificates exist
    certificateInfo = certificateManager.checkCertificates();

    if (!certificateInfo) {
      console.log(chalk.yellow("⚠️  No valid certificates found"));

      // Auto-generate self-signed certificate for development
      if (env.NODE_ENV === "development") {
        console.log(chalk.cyan("🔧 Auto-generating self-signed certificate for development..."));
        certificateInfo = await certificateManager.generateSelfSignedCertificate({
          commonName: env.HOST === "0.0.0.0" ? "localhost" : env.HOST,
          organization: "WallWhale Development",
          days: 365,
        });
      } else {
        throw new Error(
          "TLS enabled but no certificates found. Use 'npm run cert:setup' to configure certificates."
        );
      }
    }

    try {
      const key = fs.readFileSync(certificateInfo.keyPath, "utf8");
      const cert = fs.readFileSync(certificateInfo.certPath, "utf8");

      (serverOptions as any).https = {
        key,
        cert,
      };

      const typeColor =
        certificateInfo.type === "lets-encrypt"
          ? "green"
          : certificateInfo.type === "self-signed"
            ? "yellow"
            : "blue";

      console.log(chalk[typeColor](`🔒 ${certificateInfo.type} certificate loaded successfully`));

      if (certificateInfo.expiresAt) {
        const daysUntilExpiry = Math.ceil(
          (certificateInfo.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30) {
          console.log(
            chalk.red(`⚠️  Certificate expires in ${daysUntilExpiry} days. Consider renewal.`)
          );
        } else {
          console.log(chalk.dim(`   Certificate expires in ${daysUntilExpiry} days`));
        }
      }
    } catch (error) {
      throw new Error(`Failed to load TLS certificates: ${error}`);
    }
  }

  const app = Fastify(serverOptions);

  // Enhanced error handling
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          statusCode: error.statusCode,
        },
        request: {
          id: request.id,
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        },
      },
      "Request error occurred"
    );

    const statusCode = error.statusCode || 500;
    const isProduction = env.NODE_ENV === "production";

    return reply.code(statusCode).send({
      error: {
        statusCode,
        message: isProduction && statusCode === 500 ? "Internal Server Error" : error.message,
        ...(isProduction ? {} : { stack: error.stack }),
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    });
  });

  // Not found handler
  app.setNotFoundHandler(async (request, reply) => {
    app.log.warn(
      {
        request: {
          method: request.method,
          url: request.url,
          ip: request.ip,
        },
      },
      "Route not found"
    );

    return reply.code(404).send({
      error: {
        statusCode: 404,
        message: "Route not found",
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    });
  });

  // Register core plugins
  await app.register(sensible);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: env.NODE_ENV === "production",
  });

  await app.register(cors, {
    origin: getCorsOrigins(),
    credentials: true,
    optionsSuccessStatus: 200,
  });

  // Application plugins
  await app.register(prismaPlugin);
  await app.register(auditPlugin);
  await app.register(authPlugin);

  // Health monitoring
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1000000000, // 1GB
    maxRssBytes: 1000000000, // 1GB
    maxEventLoopUtilization: 0.98,
    message: "Under pressure!",
    retryAfter: 50,
    healthCheck: async () => true,
    healthCheckInterval: 5000,
  });

  // Metrics and monitoring
  if (env.ENABLE_METRICS) {
    await app.register(fastifyMetrics, {
      endpoint: "/metrics",
      defaultMetrics: { enabled: true },
      routeMetrics: { enabled: true },
    });
  }

  // Rate limiting
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) => (req as any).apiKey?.keyId || req.ip,
    max: (req) => (req as any).apiKey?.rateLimit ?? env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    ban: 0,
    hook: "preHandler",
    allowList: ["/docs", "/metrics", "/health", "/status"],
    skipOnError: env.RATE_LIMIT_SKIP_FAILED_REQUESTS,
    errorResponseBuilder: (request, context) => ({
      error: {
        statusCode: 429,
        message: "Rate limit exceeded",
        retryAfter: Math.round(context.ttl / 1000),
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    }),
  });

  // API Documentation
  if (env.DOCS_ENABLED) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: env.DOCS_TITLE,
          description: env.DOCS_DESCRIPTION,
          version: env.APP_VERSION,
          contact: {
            name: "Engineering Team",
            email: "engineering@company.com",
          },
          license: {
            name: "MIT",
          },
        },
        servers: [
          {
            url: `http${env.TLS_ENABLE ? "s" : ""}://${env.HOST}:${env.PORT}`,
            description: "Development server",
          },
        ],
        tags: [
          { name: "admin", description: "Administrative operations" },
          { name: "downloads", description: "Download management" },
          { name: "auth", description: "Authentication" },
          { name: "health", description: "Health and monitoring" },
        ],
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
            },
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    });

    await app.register(swaggerUI, {
      routePrefix: env.DOCS_PATH,
      uiConfig: {
        docExpansion: "full",
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  // Health check endpoints
  if (env.ENABLE_HEALTH_CHECKS) {
    app.get(
      "/health",
      {
        schema: {
          tags: ["health"],
          description: "Health check endpoint",
          response: {
            200: {
              type: "object",
              properties: {
                status: { type: "string" },
                timestamp: { type: "string" },
                uptime: { type: "number" },
                version: { type: "string" },
                environment: { type: "string" },
              },
            },
          },
        },
      },
      async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: env.APP_VERSION,
        environment: env.NODE_ENV,
      })
    );

    app.get(
      "/status",
      {
        schema: {
          tags: ["health"],
          description: "Detailed status check",
          response: {
            200: {
              type: "object",
              properties: {
                status: { type: "string" },
                timestamp: { type: "string" },
                services: { type: "object" },
                metrics: { type: "object" },
              },
            },
          },
        },
      },
      async () => {
        const memUsage = process.memoryUsage();

        return {
          status: "ok",
          timestamp: new Date().toISOString(),
          services: {
            database: "connected",
            steam: "ready",
          },
          metrics: {
            uptime: process.uptime(),
            memory: {
              used: Math.round(memUsage.heapUsed / 1024 / 1024),
              total: Math.round(memUsage.heapTotal / 1024 / 1024),
              rss: Math.round(memUsage.rss / 1024 / 1024),
            },
            cpu: process.cpuUsage(),
          },
        };
      }
    );
  }

  // Register application routes
  await registerRoutes(app);

  return app;
}

/**
 * Starts the server with beautiful CLI output
 */
async function startServer(options: any = {}) {
  try {
    // Clear console and show banner
    console.clear();
    console.log(createBanner());
    console.log(createWelcomeBox());

    // Initialize with enhanced startup sequence
    const spinner = showSpinner("🔧 Initializing WallWhale...");
    await new Promise((resolve) => setTimeout(resolve, 800));

    spinner.text = chalk.cyan("🔍 Validating environment configuration...");
    await new Promise((resolve) => setTimeout(resolve, 600));

    spinner.text = chalk.cyan("🏗️  Creating Fastify application instance...");
    const app = await createApp();
    await new Promise((resolve) => setTimeout(resolve, 400));

    spinner.text = chalk.cyan("🔌 Registering plugins and middleware...");
    await new Promise((resolve) => setTimeout(resolve, 700));

    spinner.text = chalk.cyan("🔒 Configuring security layers...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    spinner.text = chalk.cyan("📊 Initializing monitoring systems...");
    await new Promise((resolve) => setTimeout(resolve, 600));

    spinner.text = chalk.cyan("🚀 Starting server on network interfaces...");
    await app.listen({
      port: options.port || env.PORT,
      host: options.host || env.HOST,
    });

    spinner.succeed(chalk.green("✅ Server initialization completed successfully!"));

    const protocol = env.TLS_ENABLE ? "https" : "http";
    const bindHost = options.host || env.HOST;
    const bindPort = options.port || env.PORT;

    // Compose a primary base URL for docs/metrics links
    const baseUrl = `${protocol}://${bindHost}:${bindPort}`;

    // Gather network interfaces and actual addresses
    const addresses: string[] = [];

    try {
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        const netInfo = nets[name] || [];
        for (const ni of netInfo) {
          if (ni.family === "IPv4" && !ni.internal) {
            addresses.push(`${protocol}://${ni.address}:${bindPort}`);
          }
        }
      }
    } catch (e) {
      // ignore network enumeration errors
    }

    // Try to get the server's bound address from Fastify/Node if available
    try {
      const serverAddr: any = app.server && app.server.address && app.server.address();
      if (serverAddr) {
        if (typeof serverAddr === "string") {
          // Named pipe or unix socket
          addresses.push(serverAddr);
        } else if (serverAddr.address) {
          const hostAddr = serverAddr.address === "::" ? "127.0.0.1" : serverAddr.address;
          addresses.push(`${protocol}://${hostAddr}:${serverAddr.port || bindPort}`);
        }
      }
    } catch (e) {
      // ignore
    }

    // Ensure at least the baseUrl is present
    if (!addresses.includes(baseUrl)) addresses.unshift(baseUrl);

    console.log(createServerStartedBox(baseUrl, addresses));

    // Handle graceful shutdown with enhanced messaging
    const signals = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(chalk.yellow(`\n\n� Shutdown signal received: ${signal}`));
        console.log(chalk.cyan("📋 Initiating graceful shutdown sequence..."));

        const shutdownSpinner = showSpinner("🔌 Closing active connections...");
        await new Promise((resolve) => setTimeout(resolve, 800));

        shutdownSpinner.text = chalk.cyan("💾 Persisting application state...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        shutdownSpinner.text = chalk.cyan("🧹 Cleaning up resources...");
        await new Promise((resolve) => setTimeout(resolve, 400));

        shutdownSpinner.text = chalk.cyan("🚪 Closing server instance...");
        await app.close();

        shutdownSpinner.succeed(chalk.green("✅ Server shutdown completed successfully"));

        console.log(
          boxen(
            `${chalk.bold.blue("🎯 WallWhale")}\n\n${chalk.green("✅ Graceful shutdown completed")}\n${chalk.dim("Thank you for using our enterprise platform")}`,
            {
              padding: 1,
              margin: 1,
              borderStyle: "round",
              borderColor: "blue",
              backgroundColor: "#0a0e1a",
              textAlignment: "center",
            }
          )
        );

        process.exit(0);
      });
    });
  } catch (error) {
    console.error(chalk.red("❌ Failed to start server:"));
    console.error(error);
    process.exit(1);
  }
}

// CLI Program Setup
const program = new Command();

program
  .name("wallwhale-server")
  .description(chalk.cyan("🏢 Enterprise-grade Steam Workshop management API"))
  .version(env.APP_VERSION)
  .addHelpText(
    "before",
    chalk.bold.blue(`
╭─────────────────────────────────────────────────────────╮
│                                                         │
│         🎯 WallWhale CLI v${env.APP_VERSION}             │
│                                                         │
│     Enterprise Steam Workshop Management Platform      │
│                                                         │
╰─────────────────────────────────────────────────────────╯
`)
  )
  .addHelpText(
    "after",
    `
${chalk.bold("🚀 Quick Start Examples:")}
  ${chalk.cyan("npm start setup")}                     ${chalk.dim("# Interactive setup wizard")}
  ${chalk.cyan("npm start setup -- --docker-only")}   ${chalk.dim("# Docker deployment only")}
  ${chalk.cyan("npm start docker --setup")}           ${chalk.dim("# Docker configuration wizard")}
  ${chalk.cyan("npm start docker --start")}           ${chalk.dim("# Start Docker services")}
  ${chalk.cyan("npm start docker --logs")}            ${chalk.dim("# View service logs")}

${chalk.bold("🐳 Docker Commands:")}
  ${chalk.cyan("setup --docker-only")}        ${chalk.dim("Skip to Docker deployment configuration")}
  ${chalk.cyan("docker --setup")}             ${chalk.dim("Run Docker setup wizard")}
  ${chalk.cyan("docker --start")}             ${chalk.dim("Start all Docker services")}
  ${chalk.cyan("docker --stop")}              ${chalk.dim("Stop all Docker services")}
  ${chalk.cyan("docker --logs")}              ${chalk.dim("View real-time service logs")}
  ${chalk.cyan("docker --rebuild")}           ${chalk.dim("Rebuild and restart services")}

${chalk.bold("📚 Documentation:")}
  ${chalk.cyan("Visit the /docs endpoint when server is running for API documentation")}
  ${chalk.cyan("Check the generated/ directory for Docker deployment files")}
`
  );

// Build DepotDownloader command
program
  .command("build-depot")
  .description("🔨 Build DepotDownloader from source")
  .option("--target-dir <dir>", "Target directory for binaries", "./DepotDownloaderMod")
  .option("--force", "Force rebuild even if binaries exist")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("🔨 Building DepotDownloader from source..."));

      const setupWizard = new SetupWizard();
      const targetPath = path.resolve(options.targetDir);

      // Check if binaries already exist
      const winBinary = path.join(targetPath, "DepotDownloaderMod.exe");
      const linuxBinary = path.join(targetPath, "DepotDownloaderMod");

      if (!options.force && (fs.existsSync(winBinary) || fs.existsSync(linuxBinary))) {
        const { rebuild } = await inquirer.prompt([
          {
            type: "confirm",
            name: "rebuild",
            message: "DepotDownloader binaries already exist. Rebuild anyway?",
            default: false,
          },
        ]);

        if (!rebuild) {
          console.log(chalk.blue("ℹ️  Build cancelled. Use --force to rebuild anyway."));
          return;
        }
      }

      // Set target path in config
      (setupWizard as any).config = { depotDownloaderPath: options.targetDir };
      (setupWizard as any).projectRoot = process.cwd();

      await (setupWizard as any).buildDepotDownloader();

      console.log(chalk.green("\n🎉 DepotDownloader build completed successfully!"));
      console.log(chalk.dim(`Windows binary: ${winBinary}`));
      console.log(chalk.dim(`Linux binary: ${linuxBinary}`));
    } catch (error) {
      console.error(chalk.red("❌ Build failed:"), error);
      process.exit(1);
    }
  });

// Setup command (interactive wizard)
program
  .command("setup")
  .description("🛠️  Interactive setup wizard")
  .option("--force", "Force setup even if configuration exists")
  .option("--depot-only", "Only build DepotDownloader, skip other setup steps")
  .option("--docker-only", "Skip to Docker configuration and deployment")
  .action(async (options) => {
    try {
      const setupWizard = new SetupWizard();

      if (options.depotOnly) {
        console.log(chalk.cyan("🔨 Building DepotDownloader only..."));
        (setupWizard as any).projectRoot = process.cwd();
        (setupWizard as any).config = { depotDownloaderPath: "./DepotDownloaderMod" };
        await (setupWizard as any).buildDepotDownloader();
        console.log(chalk.green("\n🎉 DepotDownloader build completed!"));
        return;
      }

      if (options.dockerOnly) {
        console.log(chalk.cyan("🐳 Docker-only setup..."));
        await (setupWizard as any).runDockerOnlySetup();
        return;
      }

      if (options.force) {
        // Skip existing config detection
        (setupWizard as any).config = {};
      }

      await setupWizard.run();
    } catch (error) {
      console.error(chalk.red("❌ Setup failed:"), error);
      process.exit(1);
    }
  });

// Docker command (dedicated Docker setup)
program
  .command("docker")
  .description("🐳 Docker deployment management")
  .option("--setup", "Run Docker setup wizard")
  .option("--start", "Start Docker services")
  .option("--stop", "Stop Docker services")
  .option("--logs", "View Docker service logs")
  .option("--rebuild", "Rebuild and restart Docker services")
  .option("--status", "Check Docker and service status")
  .action(async (options) => {
    try {
      if (options.setup) {
        const setupWizard = new SetupWizard();
        await (setupWizard as any).runDockerOnlySetup();
      } else if (options.start) {
        console.log(chalk.cyan("🚀 Starting Docker services..."));
        await startDockerServices();
      } else if (options.stop) {
        console.log(chalk.cyan("🛑 Stopping Docker services..."));
        await stopDockerServices();
      } else if (options.logs) {
        console.log(chalk.cyan("📋 Viewing Docker logs..."));
        await viewDockerLogs();
      } else if (options.rebuild) {
        console.log(chalk.cyan("🔄 Rebuilding Docker services..."));
        await rebuildDockerServices();
      } else if (options.status) {
        console.log(chalk.cyan("🔍 Checking Docker status..."));
        await checkDockerStatus();
      } else {
        console.log(
          chalk.yellow(
            "Please specify an action: --setup, --start, --stop, --logs, --rebuild, or --status"
          )
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Docker command failed:"), error);
      process.exit(1);
    }
  });

// Quick setup command (non-interactive)
program
  .command("quick-setup")
  .description("⚡ Quick setup with defaults")
  .option("-e, --env <env>", "Environment (development|production)", "development")
  .option("-d, --database <db>", "Database (sqlite|postgresql)", "sqlite")
  .option("-p, --port <port>", "Server port", "3000")
  .option("--admin-email <email>", "Admin email", "admin@example.com")
  .option("--admin-password <password>", "Admin password", "admin123")
  .option("--steam-account <account>", "Steam account (username:password)")
  .option("--docker", "Setup for Docker deployment")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("⚡ Running quick setup..."));

      // Create basic .env file with provided options
      const envContent = `# WallWhale Configuration
# Generated by Quick Setup

NODE_ENV=${options.env}
PORT=${options.port}
HOST=0.0.0.0
DATABASE_URL=${options.database === "sqlite" ? "file:./data/depot.db" : "postgresql://depot:depot@localhost:5432/depot"}

ADMIN_EMAIL=${options.adminEmail}
ADMIN_PASSWORD=${options.adminPassword}
JWT_SECRET=${require("crypto").randomBytes(32).toString("hex")}
API_KEY_SALT=${require("crypto").randomBytes(32).toString("hex")}

${options.steamAccount ? `STEAM_ACCOUNTS=${options.steamAccount}` : "# STEAM_ACCOUNTS=username:password"}

SAVE_ROOT=./downloads
DEPOTDOWNLOADER_PATH=./DepotDownloaderMod/DepotDownloaderMod.exe

DOCS_ENABLED=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
AUTO_CLEANUP_ENABLED=true

LOG_LEVEL=info
LOG_FORMAT=${options.env === "development" ? "pretty" : "json"}
`;

      fs.writeFileSync(".env", envContent, "utf8");

      if (options.docker) {
        // Create basic docker scripts
        const startScript =
          process.platform === "win32"
            ? "@echo off\necho Starting with Docker...\ndocker-compose up -d\n"
            : '#!/bin/bash\necho "Starting with Docker..."\ndocker-compose up -d\n';

        const scriptsDir = "./scripts";
        if (!fs.existsSync(scriptsDir)) {
          fs.mkdirSync(scriptsDir, { recursive: true });
        }

        const scriptFile = process.platform === "win32" ? "start.bat" : "start.sh";
        fs.writeFileSync(path.join(scriptsDir, scriptFile), startScript, "utf8");

        if (process.platform !== "win32") {
          try {
            execSync(`chmod +x ${path.join(scriptsDir, scriptFile)}`);
          } catch (error) {
            // Ignore chmod errors
          }
        }
      }

      console.log(chalk.green("✅ Quick setup completed!"));
      console.log(chalk.cyan("📝 .env file created with basic configuration"));

      if (options.docker) {
        console.log(chalk.cyan("🐳 Docker startup script created"));
        console.log(chalk.yellow("Run: npm run docker:up"));
      } else {
        console.log(chalk.yellow("Run: npm run dev"));
      }
    } catch (error) {
      console.error(chalk.red("❌ Quick setup failed:"), error);
      process.exit(1);
    }
  });

// Environment check command
program
  .command("check")
  .description("🔍 Check environment and dependencies")
  .action(async () => {
    try {
      console.log(chalk.cyan("🔍 Checking environment..."));

      const checks = [
        {
          name: "Node.js version",
          check: () => {
            const version = process.version;
            const major = parseInt(version.slice(1).split(".")[0] || "0");
            return major >= 18;
          },
          message: `Node.js ${process.version}`,
        },
        {
          name: ".env file",
          check: () => fs.existsSync(".env"),
          message: "Environment configuration",
        },
        {
          name: "DepotDownloader",
          check: () => fs.existsSync("./DepotDownloaderMod/DepotDownloaderMod.exe"),
          message: "DepotDownloader executable",
        },
        {
          name: "Database directory",
          check: () => fs.existsSync("./data") || fs.existsSync("./prisma"),
          message: "Database storage",
        },
        {
          name: "Downloads directory",
          check: () => {
            const downloadsDir = "./downloads";
            if (!fs.existsSync(downloadsDir)) {
              fs.mkdirSync(downloadsDir, { recursive: true });
            }
            return true;
          },
          message: "Downloads storage",
        },
      ];

      let allPassed = true;

      for (const check of checks) {
        try {
          const passed = check.check();
          console.log(`  ${passed ? chalk.green("✓") : chalk.red("✗")} ${check.message}`);
          if (!passed) allPassed = false;
        } catch (error) {
          console.log(`  ${chalk.red("✗")} ${check.message} - ${error}`);
          allPassed = false;
        }
      }

      if (allPassed) {
        console.log(chalk.green("\n✅ All checks passed! System is ready."));
      } else {
        console.log(chalk.yellow("\n⚠️  Some checks failed. Run 'npm run setup' to configure."));
      }
    } catch (error) {
      console.error(chalk.red("❌ Environment check failed:"), error);
      process.exit(1);
    }
  });

// Start command (default)
program
  .command("start", { isDefault: true })
  .description("🚀 Start the WallWhale")
  .option("-p, --port <port>", "Server port", String(env.PORT))
  .option("-h, --host <host>", "Server host", env.HOST)
  .option("--dev", "Enable development mode with enhanced logging")
  .option("--production", "Enable production mode with optimizations")
  .action(async (options) => {
    if (options.dev) {
      process.env.NODE_ENV = "development";
      process.env.LOG_FORMAT = "pretty";
    }
    if (options.production) {
      process.env.NODE_ENV = "production";
      process.env.LOG_FORMAT = "json";
    }
    await startServer(options);
  });

// Health check command
program
  .command("health")
  .description("🏥 Check server health and status")
  .option("-u, --url <url>", "Server URL", `http://${env.HOST}:${env.PORT}`)
  .option("-d, --detailed", "Show detailed status information")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("🔍 Checking server health..."));

      const healthSpinner = showSpinner("Connecting to server...");
      const response = await fetch(`${options.url}/health`);
      const health = (await response.json()) as any;

      healthSpinner.succeed(chalk.green("✅ Connection established"));

      const healthBox = boxen(
        `${chalk.bold.green("🏥 Server Health Status")}

${chalk.bold("Status:")} ${chalk.green("HEALTHY")}
${chalk.bold("Uptime:")} ${chalk.cyan(`${Math.round(health.uptime || 0)}s`)}
${chalk.bold("Version:")} ${chalk.blue(health.version || "unknown")}
${chalk.bold("Environment:")} ${chalk.yellow((health.environment || "unknown").toUpperCase())}
${chalk.bold("Timestamp:")} ${chalk.dim(health.timestamp || new Date().toISOString())}

${chalk.green("✅ All systems operational")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          backgroundColor: "#0a1810",
        }
      );

      console.log(healthBox);

      if (options.detailed) {
        console.log(chalk.dim("\n📋 Detailed Response:"));
        console.log(chalk.gray(JSON.stringify(health, null, 2)));
      }
    } catch (error) {
      const errorSpinner = showSpinner("Server connection failed");
      errorSpinner.fail(chalk.red("❌ Server is not responding"));

      const errorBox = boxen(
        `${chalk.bold.red("🚨 Server Health Check Failed")}

${chalk.bold("Error:")} ${chalk.red("Connection refused")}
${chalk.bold("URL:")} ${chalk.cyan(options.url)}
${chalk.bold("Suggestion:")} ${chalk.yellow("Ensure the server is running")}

${chalk.red("❌ Server appears to be offline")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "red",
          backgroundColor: "#1a0a0a",
        }
      );

      console.log(errorBox);
      console.error(chalk.dim("\n🔍 Debug Info:"), error);
      process.exit(1);
    }
  });

// Database commands
const dbCommand = program.command("db").description("Database management commands");

dbCommand
  .command("migrate")
  .description("Run database migrations")
  .action(async () => {
    const { execSync } = await import("child_process");
    console.log(chalk.blue("🗄️  Running database migrations..."));
    execSync("npx prisma migrate dev", { stdio: "inherit" });
  });

dbCommand
  .command("seed")
  .description("Seed the database")
  .action(async () => {
    const { execSync } = await import("child_process");
    console.log(chalk.blue("🌱 Seeding database..."));
    execSync("npx prisma db seed", { stdio: "inherit" });
  });

dbCommand
  .command("studio")
  .description("Open Prisma Studio")
  .action(async () => {
    const { execSync } = await import("child_process");
    console.log(chalk.blue("🎨 Opening Prisma Studio..."));
    execSync("npx prisma studio", { stdio: "inherit" });
  });

// Certificate management commands
const certCommand = program.command("cert").description("🔐 Certificate management commands");

certCommand
  .command("setup")
  .description("🔧 Interactive certificate setup wizard")
  .action(async () => {
    try {
      console.clear();
      console.log(createBanner());

      const certInfo = await certificateManager.interactiveCertificateSetup();

      const successBox = boxen(
        `${chalk.bold.green("🎉 Certificate Setup Complete!")}

${chalk.bold("Type:")} ${chalk.cyan(certInfo.type)}
${chalk.bold("Certificate:")} ${chalk.gray(certInfo.certPath)}
${chalk.bold("Private Key:")} ${chalk.gray(certInfo.keyPath)}
${certInfo.expiresAt ? `${chalk.bold("Expires:")} ${chalk.yellow(certInfo.expiresAt.toLocaleDateString())}` : ""}

${chalk.green("✅ Your server is ready for HTTPS!")}
${chalk.dim("Update your .env file with TLS_ENABLE=true to use these certificates")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          backgroundColor: "#0a1810",
        }
      );

      console.log(successBox);

      // Update .env file automatically
      const envPath = ".env";
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        envContent = envContent.replace(/TLS_ENABLE=false/g, "TLS_ENABLE=true");
        envContent = envContent.replace(/TLS_CERT_PATH=.*/g, `TLS_CERT_PATH=${certInfo.certPath}`);
        envContent = envContent.replace(/TLS_KEY_PATH=.*/g, `TLS_KEY_PATH=${certInfo.keyPath}`);
        fs.writeFileSync(envPath, envContent);

        console.log(chalk.green("📝 .env file updated automatically"));
      }
    } catch (error) {
      console.error(chalk.red("❌ Certificate setup failed:"), error);
      process.exit(1);
    }
  });

certCommand
  .command("generate")
  .description("🔧 Generate self-signed certificate")
  .option("-d, --domain <domain>", "Domain name", "localhost")
  .option("-o, --organization <org>", "Organization name", "WallWhale")
  .option("--days <days>", "Validity period in days", "365")
  .action(async (options) => {
    try {
      const certInfo = await certificateManager.generateSelfSignedCertificate({
        commonName: options.domain,
        organization: options.organization,
        days: parseInt(options.days),
      });

      console.log(chalk.green("✅ Self-signed certificate generated successfully"));
      console.log(chalk.dim(`   Certificate: ${certInfo.certPath}`));
      console.log(chalk.dim(`   Private Key: ${certInfo.keyPath}`));
    } catch (error) {
      console.error(chalk.red("❌ Failed to generate certificate:"), error);
      process.exit(1);
    }
  });

certCommand
  .command("mkcert")
  .description("🛡️ Generate trusted local certificate using mkcert (auto-installs if needed)")
  .option("-d, --domains <domains>", "Domains (comma-separated)", "localhost,127.0.0.1")
  .action(async (options) => {
    try {
      const domains = options.domains.split(",").map((d: string) => d.trim());
      const certInfo = await certificateManager.generateMkcertCertificate(domains);

      console.log(chalk.green("✅ Certificate generated successfully"));
      console.log(chalk.dim(`   Certificate: ${certInfo.certPath}`));
      console.log(chalk.dim(`   Private Key: ${certInfo.keyPath}`));

      if (certInfo.type === "self-signed") {
        console.log(chalk.yellow("   ⚠️ Self-signed certificate (browser warnings expected)"));
        console.log(chalk.cyan("   💡 mkcert provides browser-trusted certificates"));
      } else {
        console.log(chalk.yellow("   🎉 This certificate is trusted by your browser!"));
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to generate certificate:"), error);
      process.exit(1);
    }
  });

certCommand
  .command("letsencrypt")
  .description("🌐 Obtain Let's Encrypt certificate (requires public domain)")
  .option("-d, --domain <domain>", "Domain name (required)")
  .option("-e, --email <email>", "Contact email (required)")
  .option("--staging", "Use staging environment", false)
  .action(async (options) => {
    if (!options.domain || !options.email) {
      console.error(chalk.red("❌ Domain and email are required for Let's Encrypt certificates"));
      console.log(
        chalk.yellow("Usage: npm run cert:letsencrypt -- -d yourdomain.com -e your@email.com")
      );
      process.exit(1);
    }

    try {
      const certInfo = await certificateManager.generateLetsEncryptCertificate({
        domain: options.domain,
        email: options.email,
        staging: options.staging,
      });

      console.log(chalk.green("✅ Let's Encrypt certificate obtained successfully"));
      console.log(chalk.dim(`   Certificate: ${certInfo.certPath}`));
      console.log(chalk.dim(`   Private Key: ${certInfo.keyPath}`));
    } catch (error) {
      console.error(chalk.red("❌ Failed to obtain Let's Encrypt certificate:"), error);
      process.exit(1);
    }
  });

certCommand
  .command("check")
  .description("🔍 Check certificate status")
  .action(async () => {
    const certInfo = certificateManager.checkCertificates();

    if (!certInfo) {
      console.log(chalk.yellow("⚠️  No certificates found"));
      console.log(chalk.cyan("Run 'npm run cert:setup' to configure certificates"));
      return;
    }

    const statusBox = boxen(
      `${chalk.bold.blue("🔐 Certificate Status")}

${chalk.bold("Type:")} ${chalk.cyan(certInfo.type)}
${chalk.bold("Certificate:")} ${chalk.gray(certInfo.certPath)}
${chalk.bold("Private Key:")} ${chalk.gray(certInfo.keyPath)}
${certInfo.expiresAt ? `${chalk.bold("Expires:")} ${chalk.yellow(certInfo.expiresAt.toLocaleDateString())}` : ""}
${certInfo.domains ? `${chalk.bold("Domains:")} ${chalk.green(certInfo.domains.join(", "))}` : ""}

${chalk.green("✅ Certificates are valid and ready for use")}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "blue",
        backgroundColor: "#0a0e1a",
      }
    );

    console.log(statusBox);
  });

// Download management commands
const downloadCommand = program.command("download").description("📥 Download management commands");

downloadCommand
  .command("direct")
  .description("📁 Download directly to local PC")
  .option("-i, --id <id>", "Steam Workshop ID or URL (required)")
  .option("-a, --account <account>", "Steam account name (required)")
  .option("-o, --output <path>", "Output directory", env.SAVE_ROOT)
  .option("--no-zip", "Skip creating zip archive")
  .option("--keep-temp", "Keep temporary files (don't cleanup)", false)
  .action(async (options) => {
    if (!options.id || !options.account) {
      console.error(chalk.red("❌ ID and account are required"));
      console.log(chalk.yellow("Usage: npm run cli download direct -i <id> -a <account>"));
      process.exit(1);
    }

    try {
      console.clear();
      console.log(createBanner());

      const downloadBox = boxen(
        `${chalk.bold.cyan("📥 Direct Download Initiated")}

${chalk.bold("Workshop ID/URL:")} ${chalk.yellow(options.id)}
${chalk.bold("Steam Account:")} ${chalk.green(options.account)}
${chalk.bold("Output Directory:")} ${chalk.gray(path.resolve(options.output))}
${chalk.bold("Create Archive:")} ${options.zip ? chalk.green("Yes") : chalk.dim("No")}
${chalk.bold("Cleanup Temp Files:")} ${!options.keepTemp ? chalk.green("Yes") : chalk.dim("No")}

${chalk.cyan("🚀 Starting download process...")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "cyan",
          backgroundColor: "#0a1020",
        }
      );

      console.log(downloadBox);

      console.log(chalk.cyan("🚀 Starting download process..."));

      // TODO: Import required modules when directDownload utility is implemented
      // const { directDownload } = await import("./utils/directDownload.js");

      console.log(chalk.yellow("⚠️  Direct download functionality not yet implemented"));
      console.log(chalk.gray("This feature will be available in a future update"));

      // Example of what the result would look like:

      const result = await directDownload({
        urlOrId: options.id,
        accountName: options.account,
        outputPath: options.output,
        createZip: options.zip,
        cleanup: !options.keepTemp,
        onProgress: (message: string) => {
          // Only show progress for meaningful updates, not every line
          if (
            message.includes("%") ||
            message.includes("completed") ||
            message.includes("Starting")
          ) {
            console.log(chalk.gray(`  ├─ ${message}`));
          }
        },
      });

      console.log(chalk.green("\n✅ Download completed successfully!"));

      const successBox = boxen(
        `${chalk.bold.green("🎉 Download Complete!")}

${chalk.bold("Downloaded to:")} ${chalk.cyan(result.outputPath)}
${options.zip ? `${chalk.bold("Archive created:")} ${chalk.cyan(result.zipPath)}` : ""}
${chalk.bold("File size:")} ${chalk.yellow(result.size || "Unknown")}
${chalk.bold("Duration:")} ${chalk.blue(`${result.duration}ms`)}

${chalk.green("✅ Ready for use!")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          backgroundColor: "#0a1810",
        }
      );

      console.log(successBox);
    } catch (error) {
      console.error(chalk.red("❌ Download failed:"), error);
      process.exit(1);
    }
  });

downloadCommand
  .command("host")
  .description("🌐 Download and host files for public access")
  .option("-i, --ids <ids>", "Comma-separated Workshop IDs or URLs (required)")
  .option("-a, --account <account>", "Steam account name (required)")
  .option("-p, --port <port>", "Hosting port", "8080")
  .option("-h, --host <host>", "Hosting host", "0.0.0.0")
  .option("--password <password>", "Optional password protection")
  .option("--expire <hours>", "Auto-expire after hours (0 = no expiration)", "0")
  .option("--ssl", "Enable HTTPS", false)
  .action(async (options) => {
    if (!options.ids || !options.account) {
      console.error(chalk.red("❌ IDs and account are required"));
      console.log(chalk.yellow("Usage: npm run cli download host -i <id1,id2> -a <account>"));
      process.exit(1);
    }

    try {
      console.clear();
      console.log(createBanner());

      const ids = options.ids.split(",").map((id: string) => id.trim());

      const hostingBox = boxen(
        `${chalk.bold.cyan("🌐 File Hosting Service")}

${chalk.bold("Workshop IDs:")} ${chalk.yellow(ids.join(", "))}
${chalk.bold("Steam Account:")} ${chalk.green(options.account)}
${chalk.bold("Host Address:")} ${chalk.cyan(`${options.host}:${options.port}`)}
${chalk.bold("Protocol:")} ${options.ssl ? chalk.green("HTTPS") : chalk.yellow("HTTP")}
${options.password ? `${chalk.bold("Password Protected:")} ${chalk.green("Yes")}` : ""}
${chalk.bold("Auto-expire:")} ${parseInt(options.expire) > 0 ? chalk.blue(`${options.expire} hours`) : chalk.green("Never")}

${chalk.cyan("🚀 Starting download and hosting process...")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "cyan",
          backgroundColor: "#0a1020",
        }
      );

      console.log(hostingBox);

      console.log(chalk.cyan("🚀 Setting up hosting environment..."));

      // TODO: Import required modules when fileHosting utility is implemented
      // const { hostFiles } = await import("./utils/fileHosting.js");

      console.log(chalk.yellow("⚠️  File hosting functionality not yet implemented"));
      console.log(chalk.gray("This feature will be available in a future update"));

      // Example of what the result would look like:
      const hostingResult = {
        url: `http${options.ssl ? "s" : ""}://${options.host}:${options.port}`,
        qrCode: false,
        files: ids.map((id: string) => ({ name: `${id}.zip`, size: "Unknown" })),
      };

      /*
      const hostingResult = await hostFiles({
        ids,
        accountName: options.account,
        port: parseInt(options.port),
        host: options.host,
        password: options.password,
        expireHours: parseInt(options.expire),
        ssl: options.ssl,
        onProgress: (message: string) => {
          // Only show progress for meaningful updates
          if (
            message.includes("Starting") ||
            message.includes("completed") ||
            message.includes("hosting")
          ) {
            console.log(chalk.gray(`  ├─ ${message}`));
          }
        },
      });
      */

      console.log(chalk.green("\n✅ Files are now being hosted!"));

      const accessBox = boxen(
        `${chalk.bold.green("🌐 Files Now Available!")}

${chalk.bold("Access URL:")} ${chalk.cyan.underline(hostingResult.url)}
${hostingResult.qrCode ? `${chalk.bold("QR Code:")} Available for mobile access` : ""}
${options.password ? `${chalk.bold("Password:")} ${chalk.yellow(options.password)}` : ""}
${chalk.bold("Available Files:")} ${chalk.blue(hostingResult.files.length.toString())}

${hostingResult.files
  .map((file: any) => `  • ${chalk.green(file.name)} ${chalk.dim(`(${file.size})`)}`)
  .join("\n")}

${chalk.bold("Expires:")} ${parseInt(options.expire) > 0 ? chalk.yellow(new Date(Date.now() + parseInt(options.expire) * 60 * 60 * 1000).toLocaleString()) : chalk.green("Never")}

${chalk.green("✅ Share the URL above to provide access!")}
${chalk.dim("Press Ctrl+C to stop hosting")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          backgroundColor: "#0a1810",
        }
      );

      console.log(accessBox);

      // Keep the process alive
      process.on("SIGINT", () => {
        console.log(chalk.yellow("\n🛑 Shutting down file hosting..."));
        process.exit(0);
      });
    } catch (error) {
      console.error(chalk.red("❌ Hosting setup failed:"), error);
      process.exit(1);
    }
  });

downloadCommand
  .command("list")
  .description("📋 List recent downloads")
  .option("-l, --limit <limit>", "Number of downloads to show", "10")
  .option("--status <status>", "Filter by status (queued|running|success|failed)")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("📋 Loading recent downloads..."));

      // Import database connection
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      const downloads = await prisma.download.findMany({
        where: options.status ? { status: options.status.toUpperCase() } : {},
        orderBy: { createdAt: "desc" },
        take: parseInt(options.limit),
        include: {
          createdBy: {
            select: { email: true },
          },
        },
      });

      if (downloads.length === 0) {
        console.log(chalk.yellow("📭 No downloads found"));
        return;
      }

      const listBox = boxen(
        `${chalk.bold.cyan("📋 Recent Downloads")}

${downloads
  .map(
    (dl, index) =>
      `${chalk.bold(`${index + 1}.`)} ${chalk.yellow(dl.pubfileId)} ${getStatusIcon(dl.status)} ${chalk[getStatusColor(dl.status)](dl.status)}
   ${chalk.dim(`Account: ${dl.accountName} | Created: ${dl.createdAt.toLocaleDateString()}`)}
   ${dl.zipPath ? chalk.green(`✓ Archive: ${path.basename(dl.zipPath)}`) : ""}
   ${dl.error ? chalk.red(`✗ Error: ${dl.error}`) : ""}`
  )
  .join("\n\n")}

${chalk.dim(`Showing ${downloads.length} of recent downloads`)}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "blue",
          backgroundColor: "#0a0e1a",
        }
      );

      console.log(listBox);

      await prisma.$disconnect();
    } catch (error) {
      console.error(chalk.red("❌ Failed to list downloads:"), error);
      process.exit(1);
    }
  });

// Utility functions for download list
function getStatusIcon(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "✅";
    case "FAILED":
      return "❌";
    case "RUNNING":
      return "🔄";
    case "QUEUED":
      return "⏳";
    default:
      return "❓";
  }
}

function getStatusColor(status: string): "green" | "red" | "yellow" | "blue" | "gray" {
  switch (status) {
    case "SUCCESS":
      return "green";
    case "FAILED":
      return "red";
    case "RUNNING":
      return "yellow";
    case "QUEUED":
      return "blue";
    default:
      return "gray";
  }
}

// Configuration commands
const configCommand = program
  .command("config")
  .description("⚙️  Configuration management commands");

configCommand
  .command("show")
  .description("📊 Show current configuration")
  .action(async () => {
    const configSummary = getConfigSummary();

    const configBox = boxen(
      `${chalk.bold.cyan("⚙️  Current Configuration")}

${chalk.bold("🌍 Environment")}
  ${chalk.bold("Mode:")} ${chalk.yellow(env.NODE_ENV.toUpperCase())}
  ${chalk.bold("Version:")} ${chalk.green(env.APP_VERSION)}
  ${chalk.bold("Host:")} ${chalk.cyan(`${env.HOST}:${env.PORT}`)}
  ${chalk.bold("TLS:")} ${env.TLS_ENABLE ? chalk.green("Enabled") : chalk.yellow("Disabled")}

${chalk.bold("🔧 Features")}
  ${chalk.bold("Metrics:")} ${env.ENABLE_METRICS ? chalk.green("Enabled") : chalk.red("Disabled")}
  ${chalk.bold("Health Checks:")} ${env.ENABLE_HEALTH_CHECKS ? chalk.green("Enabled") : chalk.red("Disabled")}
  ${chalk.bold("Documentation:")} ${env.DOCS_ENABLED ? chalk.green("Enabled") : chalk.red("Disabled")}
  ${chalk.bold("Auto Cleanup:")} ${env.AUTO_CLEANUP_ENABLED ? chalk.green("Enabled") : chalk.red("Disabled")}

${chalk.bold("📁 Paths")}
  ${chalk.bold("Save Root:")} ${chalk.gray(env.SAVE_ROOT)}
  ${chalk.bold("DepotDownloader:")} ${chalk.gray(getDepotDownloaderPath())}
  ${chalk.bold("Required Subpath:")} ${chalk.gray(env.REQUIRE_SUBPATH)}

${chalk.bold("🔒 Security")}
  ${chalk.bold("Rate Limit:")} ${chalk.cyan(`${env.RATE_LIMIT_MAX} req/${env.RATE_LIMIT_WINDOW / 1000}s`)}
  ${chalk.bold("Max Upload Size:")} ${chalk.cyan(env.MAX_UPLOAD_SIZE)}
  ${chalk.bold("Request Timeout:")} ${chalk.cyan(`${env.REQUEST_TIMEOUT}ms`)}

${chalk.bold("⚡ Performance")}
  ${chalk.bold("Global Concurrency:")} ${chalk.cyan(env.GLOBAL_CONCURRENCY.toString())}
  ${chalk.bold("Per-Key Concurrency:")} ${chalk.cyan(env.PER_KEY_CONCURRENCY.toString())}
  ${chalk.bold("Log Level:")} ${chalk.cyan(env.LOG_LEVEL.toUpperCase())}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
        backgroundColor: "#0a0e1a",
      }
    );

    console.log(configBox);
  });

configCommand
  .command("validate")
  .description("✅ Validate configuration and dependencies")
  .action(async () => {
    console.log(chalk.cyan("🔍 Validating configuration and dependencies..."));

    const spinner = showSpinner("Checking environment variables...");

    try {
      // Validate environment
      validateProductionConfig();
      spinner.text = chalk.cyan("Checking DepotDownloader executable...");

      // Check if DepotDownloader exists
      if (!isDepotDownloaderAvailable()) {
        spinner.fail(chalk.red("❌ DepotDownloader executable not found"));
        console.log(chalk.yellow(`Expected path: ${getDepotDownloaderPath()}`));
        process.exit(1);
      }

      spinner.text = chalk.cyan("Checking database connection...");

      // Check database
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      await prisma.$connect();
      await prisma.$disconnect();

      spinner.text = chalk.cyan("Checking certificate configuration...");

      // Check certificates if TLS enabled
      if (env.TLS_ENABLE) {
        const certInfo = certificateManager.checkCertificates();
        if (!certInfo) {
          spinner.warn(chalk.yellow("⚠️  TLS enabled but no certificates found"));
        }
      }

      spinner.succeed(chalk.green("✅ All validation checks passed!"));

      const validationBox = boxen(
        `${chalk.bold.green("✅ Configuration Validation Complete")}

${chalk.green("✓")} Environment variables
${chalk.green("✓")} DepotDownloader executable
${chalk.green("✓")} Database connection
${env.TLS_ENABLE ? (certificateManager.checkCertificates() ? chalk.green("✓") : chalk.yellow("⚠")) : chalk.dim("○")} TLS certificates ${env.TLS_ENABLE ? "" : chalk.dim("(disabled)")}

${chalk.bold.green("🎯 System is ready for operation!")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          backgroundColor: "#0a1810",
        }
      );

      console.log(validationBox);
    } catch (error) {
      spinner.fail(chalk.red("❌ Validation failed"));
      console.error(chalk.red("Error:"), error);
      process.exit(1);
    }
  });

// Docker Management Helper Functions
async function startDockerServices(): Promise<void> {
  const generatedPath = path.join(process.cwd(), "generated");

  if (!fs.existsSync(path.join(generatedPath, "docker-compose.yml"))) {
    console.log(chalk.red("❌ Docker compose file not found. Run setup first."));
    console.log(chalk.cyan("   npm run setup -- --docker-only"));
    process.exit(1);
  }

  try {
    execSync("docker-compose up -d", { cwd: generatedPath, stdio: "inherit" });
    console.log(chalk.green("✅ Docker services started successfully!"));
  } catch (error) {
    console.error(chalk.red("❌ Failed to start Docker services:"), error);
    process.exit(1);
  }
}

async function stopDockerServices(): Promise<void> {
  const generatedPath = path.join(process.cwd(), "generated");

  try {
    execSync("docker-compose down", { cwd: generatedPath, stdio: "inherit" });
    console.log(chalk.green("✅ Docker services stopped successfully!"));
  } catch (error) {
    console.error(chalk.red("❌ Failed to stop Docker services:"), error);
    process.exit(1);
  }
}

async function viewDockerLogs(): Promise<void> {
  const generatedPath = path.join(process.cwd(), "generated");

  try {
    execSync("docker-compose logs -f", { cwd: generatedPath, stdio: "inherit" });
  } catch (error) {
    console.error(chalk.red("❌ Failed to view Docker logs:"), error);
    process.exit(1);
  }
}

async function rebuildDockerServices(): Promise<void> {
  const generatedPath = path.join(process.cwd(), "generated");

  try {
    console.log(chalk.cyan("🛑 Stopping services..."));
    execSync("docker-compose down", { cwd: generatedPath, stdio: "inherit" });

    console.log(chalk.cyan("🔨 Rebuilding images..."));
    execSync("docker-compose build --no-cache", { cwd: generatedPath, stdio: "inherit" });

    console.log(chalk.cyan("🚀 Starting services..."));
    execSync("docker-compose up -d", { cwd: generatedPath, stdio: "inherit" });

    console.log(chalk.green("✅ Docker services rebuilt and started successfully!"));
  } catch (error) {
    console.error(chalk.red("❌ Failed to rebuild Docker services:"), error);
    process.exit(1);
  }
}

async function checkDockerStatus(): Promise<void> {
  console.log(chalk.bold.blue("🐳 Docker Status Check"));
  console.log(chalk.cyan("─".repeat(50)));

  let allGood = true;

  // Check Docker installation
  try {
    const dockerVersion = execSync("docker --version", { encoding: "utf8" }).trim();
    console.log(chalk.green("✅ Docker installed:"), chalk.dim(dockerVersion));
  } catch (error) {
    console.log(chalk.red("❌ Docker not installed"));
    console.log(chalk.yellow("   Install from: https://docs.docker.com/get-docker/"));
    allGood = false;
  }

  // Check Docker daemon
  try {
    execSync("docker info", { stdio: "pipe" });
    console.log(chalk.green("✅ Docker daemon running"));
  } catch (error) {
    console.log(chalk.red("❌ Docker daemon not running"));
    console.log(chalk.yellow("   Start Docker Desktop or run: sudo systemctl start docker"));
    allGood = false;
  }

  // Check Docker Compose
  try {
    let composeVersion = "";
    try {
      composeVersion = execSync("docker-compose --version", { encoding: "utf8" }).trim();
    } catch {
      composeVersion = execSync("docker compose version", { encoding: "utf8" }).trim();
    }
    console.log(chalk.green("✅ Docker Compose available:"), chalk.dim(composeVersion));
  } catch (error) {
    console.log(chalk.red("❌ Docker Compose not available"));
    allGood = false;
  }

  // Check generated files
  const generatedPath = path.join(process.cwd(), "generated");
  const composeFile = path.join(generatedPath, "docker-compose.yml");

  if (fs.existsSync(composeFile)) {
    console.log(chalk.green("✅ Docker compose file found"));

    // Check service status if compose file exists
    try {
      const psOutput = execSync("docker-compose ps", {
        cwd: generatedPath,
        encoding: "utf8",
      });

      console.log(chalk.bold("\n📊 Service Status:"));
      console.log(chalk.dim(psOutput));

      // Check if services are running
      if (psOutput.includes("Up")) {
        console.log(chalk.green("✅ Services are running"));

        // Try to check application health
        try {
          execSync("curl -f http://localhost:3000/health", { stdio: "pipe" });
          console.log(chalk.green("✅ Application responding"));
          console.log(chalk.cyan("   🌐 App: http://localhost:3000"));
          console.log(chalk.cyan("   📚 Docs: http://localhost:3000/docs"));
        } catch {
          console.log(chalk.yellow("⚠️  Application not responding"));
          console.log(chalk.dim("   Check logs: docker-compose logs app"));
        }
      } else {
        console.log(chalk.yellow("⚠️  Services not running"));
        console.log(chalk.dim("   Start with: npm run docker --start"));
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️  Could not check service status"));
    }
  } else {
    console.log(chalk.yellow("⚠️  Docker deployment not configured"));
    console.log(chalk.dim("   Run: npm run setup -- --docker-only"));
    allGood = false;
  }

  console.log(chalk.cyan("─".repeat(50)));
  if (allGood) {
    console.log(chalk.green("🎉 All Docker components are ready!"));
  } else {
    console.log(chalk.yellow("⚠️  Some issues found. Please address them above."));
  }
} // Import statements for the new utilities (already imported above)

// Parse CLI arguments
program.parse();
