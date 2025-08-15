import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import { createHmac, randomBytes } from "node:crypto";

export type ApiKeyClaims = {
  keyId: string;
  scopes: string[];
  ownerId: string;
  rateLimit?: number;
  maxConcurrent?: number;
};

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: ApiKeyClaims;
  }
}

function maskKey(key: string) {
  if (key.length < 6) return "***";
  return key.slice(0, 4) + "…" + key.slice(-2);
}

export function hashKey(raw: string, salt: string) {
  return createHmac("sha256", salt).update(raw).digest("hex");
}

export function generateKey(): { id: string; secret: string; hash: string } {
  const secret = "ddsk_" + randomBytes(24).toString("base64url");
  const id = randomBytes(8).toString("hex");
  return { id, secret, hash: "" };
}

const rateState = new Map<string, { count: number; resetAt: number }>();

export default fp(async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    const path = (req.url || "").split("?")[0];
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip;
    // Simple allow/deny check via env
    const allow =
      process.env.IP_ALLOW_LIST?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    const deny =
      process.env.IP_DENY_LIST?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    if (deny.includes(ip)) return reply.code(403).send({ error: "IP blocked" });
    if (allow.length && !allow.includes(ip))
      return reply.code(403).send({ error: "IP not allowed" });

    // Public routes
    if (path?.startsWith("/docs") || path === "/metrics" || path?.endsWith("/health")) return;

    const header = req.headers["authorization"] || req.headers["x-api-key"];
    if (!header) return reply.code(401).send({ error: "Missing API key" });
    const token = Array.isArray(header) ? header[0] : header;
    if (!token) return reply.code(401).send({ error: "Invalid API key format" });
    const raw = token.replace(/^Bearer\s+/i, "").trim();

    const prisma = app.prisma;
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        key: raw,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { scopes: true, owner: true },
    });
    if (!apiKey) return reply.code(401).send({ error: "Invalid API key" });

    // Per-key rate limit (requests per minute)
    if (apiKey.rateLimit && apiKey.rateLimit > 0) {
      const now = Date.now();
      const slot = rateState.get(apiKey.id) || {
        count: 0,
        resetAt: now + 60_000,
      };
      if (now > slot.resetAt) {
        slot.count = 0;
        slot.resetAt = now + 60_000;
      }
      slot.count += 1;
      rateState.set(apiKey.id, slot);
      if (slot.count > apiKey.rateLimit) {
        reply.header("Retry-After", Math.ceil((slot.resetAt - now) / 1000));
        return reply.code(429).send({ error: "Rate limit exceeded" });
      }
    }

    // Quotas daily/monthly
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const updates: any = {};
    const ak: any = apiKey as any;
    if (!ak.usageDailyResetAt || ak.usageDailyResetAt < dayStart) {
      updates.usageDaily = 0;
      updates.usageDailyResetAt = now;
    }
    if (!ak.usageMonthlyResetAt || ak.usageMonthlyResetAt < monthStart) {
      updates.usageMonthly = 0;
      updates.usageMonthlyResetAt = now;
    }
    if (apiKey.quotaDaily != null && (ak.usageDaily ?? 0) + 1 > apiKey.quotaDaily) {
      return reply.code(429).send({ error: "Daily quota exceeded" });
    }
    if (apiKey.quotaMonthly != null && (ak.usageMonthly ?? 0) + 1 > apiKey.quotaMonthly) {
      return reply.code(429).send({ error: "Monthly quota exceeded" });
    }
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        ...updates,
        usageDaily: (ak.usageDaily ?? 0) + 1,
        usageMonthly: (ak.usageMonthly ?? 0) + 1,
      },
    });

    // Attach claims
    req.apiKey = {
      keyId: apiKey.id,
      scopes: apiKey.scopes.map((s) => s.name),
      ownerId: apiKey.ownerId,
      rateLimit: apiKey.rateLimit ?? undefined,
      maxConcurrent: (ak.maxConcurrent as number | undefined) ?? undefined,
    };

    // Audit
    await (prisma as any).auditLog.create({
      data: {
        apiKeyId: apiKey.id,
        action: "request",
        ip,
        route: path,
        method: req.method,
      },
    });
  });
});
