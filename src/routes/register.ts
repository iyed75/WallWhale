import type { FastifyInstance } from "fastify";
import { downloadRoutes } from "./v1/downloads.js";
import { adminRoutes } from "./v1/admin.js";

export async function registerRoutes(app: FastifyInstance) {
  app.register(async (instance) => {
    instance.register(downloadRoutes, { prefix: "/api/v1/downloads" });
    instance.register(adminRoutes, { prefix: "/api/v1/admin" });
  });
}
