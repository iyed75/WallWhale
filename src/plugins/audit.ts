import fastifyPlugin from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { AuditLogger, AUDIT_ACTIONS } from "../utils/audit.js";

declare module "fastify" {
  interface FastifyInstance {
    audit: AuditLogger;
  }
}

export default fastifyPlugin(async function auditPlugin(fastify: FastifyInstance) {
  // Create audit logger instance
  const auditLogger = new AuditLogger(fastify);

  // Decorate fastify instance with audit logger
  fastify.decorate("audit", auditLogger);

  // Add hook to log server startup
  fastify.addHook("onReady", async () => {
    try {
      await auditLogger.log({
        action: AUDIT_ACTIONS.SERVER_STARTED,
        details: {
          port: process.env.PORT || 3000,
          host: process.env.HOST || "localhost",
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        },
      });
    } catch (error) {
      fastify.log.warn(error, "Failed to log server startup to audit log");
    }
  });

  // Add hook to log server shutdown
  fastify.addHook("onClose", async () => {
    try {
      await auditLogger.log({
        action: AUDIT_ACTIONS.SERVER_STOPPED,
        details: {
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      fastify.log.warn(error, "Failed to log server shutdown to audit log");
    }
  });

  // Optional: Add request/response logging for sensitive routes
  fastify.addHook("onResponse", async (request, reply) => {
    try {
      // Only audit admin routes and auth-related routes
      if (request.url.includes("/admin/") || request.url.includes("/auth/")) {
        const isError = reply.statusCode >= 400;

        if (isError) {
          await auditLogger.logRequest(request, AUDIT_ACTIONS.ACCESS_DENIED, reply.statusCode, {
            error: true,
            userAgent: request.headers["user-agent"],
          });
        }
      }
    } catch (error) {
      fastify.log.warn(error, "Failed to log request to audit log");
    }
  });
});
