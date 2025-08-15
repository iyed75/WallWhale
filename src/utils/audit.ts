import type { FastifyInstance, FastifyRequest } from "fastify";

export interface AuditLogData {
  action: string;
  userId?: string;
  apiKeyId?: string;
  ip?: string;
  route?: string;
  method?: string;
  status?: number;
  details?: Record<string, any>;
}

export class AuditLogger {
  constructor(private app: FastifyInstance) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.app.prisma.auditLog.create({
        data: {
          action: data.action,
          userId: data.userId,
          apiKeyId: data.apiKeyId,
          ip: data.ip,
          route: data.route,
          method: data.method,
          status: data.status,
        },
      });

      // Also log to application logger with structured data
      this.app.log.info(
        {
          audit: true,
          action: data.action,
          userId: data.userId,
          apiKeyId: data.apiKeyId,
          ip: data.ip,
          route: data.route,
          method: data.method,
          status: data.status,
          details: data.details,
        },
        `AUDIT: ${data.action}`
      );
    } catch (error) {
      this.app.log.error({ error, auditData: data }, "Failed to write audit log");
    }
  }

  // Helper method to extract request info
  extractRequestInfo(req: FastifyRequest): Pick<AuditLogData, "ip" | "route" | "method"> {
    return {
      ip: req.ip,
      route: req.url,
      method: req.method,
    };
  }

  // Helper method to create audit log from request
  async logRequest(
    req: FastifyRequest,
    action: string,
    status?: number,
    details?: Record<string, any>
  ): Promise<void> {
    const requestInfo = this.extractRequestInfo(req);

    await this.log({
      action,
      userId: (req as any).user?.id,
      apiKeyId: (req as any).apiKey?.keyId,
      status,
      details,
      ...requestInfo,
    });
  }
}

// Audit action constants
export const AUDIT_ACTIONS = {
  // Authentication & Authorization
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGOUT: "auth.logout",
  API_KEY_USED: "auth.api_key.used",
  ACCESS_DENIED: "auth.access_denied",

  // API Key Management
  API_KEY_CREATED: "admin.api_key.created",
  API_KEY_DELETED: "admin.api_key.deleted",
  API_KEY_REGENERATED: "admin.api_key.regenerated",
  API_KEY_REVOKED: "admin.api_key.revoked",

  // User Management
  USER_CREATED: "admin.user.created",
  USER_UPDATED: "admin.user.updated",
  USER_DELETED: "admin.user.deleted",

  // Steam User Management
  STEAM_USER_CREATED: "admin.steam_user.created",
  STEAM_USER_UPDATED: "admin.steam_user.updated",
  STEAM_USER_DELETED: "admin.steam_user.deleted",

  // Download Operations
  DOWNLOAD_STARTED: "download.started",
  DOWNLOAD_COMPLETED: "download.completed",
  DOWNLOAD_FAILED: "download.failed",
  DOWNLOAD_CANCELLED: "download.cancelled",

  // Data Access
  ADMIN_DATA_ACCESSED: "admin.data.accessed",
  AUDIT_LOGS_ACCESSED: "admin.audit.accessed",

  // System Events
  SERVER_STARTED: "system.server.started",
  SERVER_STOPPED: "system.server.stopped",
  CONFIG_CHANGED: "system.config.changed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
