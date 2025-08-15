import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import sensible from "@fastify/sensible";

type PrismaMock = any;

export type ApiKeyClaims = {
  keyId: string;
  scopes: string[];
  ownerId: string;
  rateLimit?: number;
  maxConcurrent?: number;
};

export interface BuildAppOptions {
  prisma?: PrismaMock;
  apiKey?: Partial<ApiKeyClaims> | false; // false disables auth injection
  register?: (app: FastifyInstance) => Promise<void> | void;
  withAdminRoutes?: boolean;
  withDownloadRoutes?: boolean;
}

/**
 * Build a minimal Fastify app for tests with mocked prisma and auth injection.
 */
export async function buildTestApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Register sensible to get reply helpers like reply.forbidden
  await app.register(sensible);

  // Decorate prisma
  (app as any).decorate("prisma", options.prisma ?? {});

  // Decorate audit with no-op logger used by routes
  (app as any).decorate("audit", {
    log: async () => {},
    logRequest: async () => {},
  });

  // reply helpers like reply.forbidden are provided by @fastify/sensible
  // No manual decoration here to avoid duplicate decorator errors

  // Auth injection preHandler to simulate req.apiKey
  if (options.apiKey !== false) {
    app.addHook("onRequest", async (req: FastifyRequest) => {
      (req as any).apiKey = {
        keyId: "test-key-id",
        scopes: ["admin:*", "download:read", "download:write"],
        ownerId: "owner-1",
        ...options.apiKey,
      };
    });
  }

  if (options.withAdminRoutes) {
    const { adminRoutes } = await import("../../src/routes/v1/admin.js");
    await app.register(async (instance) => {
      await instance.register(adminRoutes, { prefix: "/api/v1/admin" });
    });
  }

  if (options.withDownloadRoutes) {
    const { downloadRoutes } = await import("../../src/routes/v1/downloads.js");
    await app.register(async (instance) => {
      await instance.register(downloadRoutes, { prefix: "/api/v1/downloads" });
    });
  }

  if (options.register) {
    await options.register(app);
  }

  await app.ready();
  return app;
}
