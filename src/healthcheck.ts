/**
 * Docker Health Check Script
 *
 * Performs comprehensive health checks for the containerized application
 */

import http from "node:http";
import process from "node:process";

interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  checks: Record<string, boolean>;
  timestamp: string;
}

/**
 * Performs HTTP health check
 */
async function checkHttpHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: process.env.PORT || 3000,
      path: "/health",
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Checks if the process is responding
 */
function checkProcessHealth(): boolean {
  try {
    // Check if we can access process information
    const usage = process.memoryUsage();
    const uptime = process.uptime();

    // Basic sanity checks
    return usage.heapUsed > 0 && usage.heapTotal > 0 && uptime > 0;
  } catch {
    return false;
  }
}

/**
 * Checks memory usage
 */
function checkMemoryHealth(): boolean {
  try {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    // Fail if memory usage is above 90%
    return memoryUsage < 90;
  } catch {
    return false;
  }
}

/**
 * Main health check function
 */
async function runHealthCheck(): Promise<HealthCheckResult> {
  const checks = {
    http: await checkHttpHealth(),
    process: checkProcessHealth(),
    memory: checkMemoryHealth(),
  };

  const isHealthy = Object.values(checks).every((check) => check);

  return {
    status: isHealthy ? "healthy" : "unhealthy",
    checks,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute health check and exit with appropriate code
 */
async function main(): Promise<void> {
  try {
    const result = await runHealthCheck();

    console.log(JSON.stringify(result, null, 2));

    // Exit with code 0 for healthy, 1 for unhealthy
    process.exit(result.status === "healthy" ? 0 : 1);
  } catch (error) {
    console.error("Health check failed:", error);
    process.exit(1);
  }
}

// Run health check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Health check error:", error);
    process.exit(1);
  });
}

export { runHealthCheck };
