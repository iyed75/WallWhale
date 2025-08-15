import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/plugins/auth.ts";

// Minimal prisma mock used by plugin
const prisma = {
  apiKey: {
    findFirst: vi.fn().mockResolvedValue({
      id: "k1",
      ownerId: "o1",
      key: "key_123",
      revokedAt: null,
      expiresAt: null,
      rateLimit: 2,
      quotaDaily: null,
      quotaMonthly: null,
      scopes: [{ name: "download:read" }],
      owner: {},
    } as any),
    update: vi.fn().mockResolvedValue({}),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
} as any;

function makeApp() {
  const app = Fastify({ logger: false });
  (app as any).decorate("prisma", prisma);
  return app;
}

describe("auth plugin", () => {
  it("attaches apiKey claims and enforces rate limit", async () => {
    const app = makeApp();
    // Stub env IP allow list empty to avoid blocking and required secrets
    process.env.IP_ALLOW_LIST = "";
    process.env.IP_DENY_LIST = "";
    process.env.ENCRYPTION_SECRET = "a-super-secret-key-for-testing-123";
    await app.register(authPlugin);

    app.get("/x", async (req) => ({ ok: true, keyId: (req as any).apiKey?.keyId }));

    await app.ready();
    const headers = {
      authorization: "Bearer key_123",
      "x-api-key": "key_123",
      "x-forwarded-for": "127.0.0.1",
    } as any;

    // First request OK
    let res = await app.inject({ method: "GET", url: "/x", headers });
    // Debug: ensure prisma was queried and inspect any error
    expect(prisma.apiKey.findFirst).toHaveBeenCalled();
    if (res.statusCode !== 200) {
      try {
        const body = res.json();
        // include body in assertion message
        expect.fail(`unexpected status ${res.statusCode}: ${JSON.stringify(body)}`);
      } catch {
        expect.fail(`unexpected status ${res.statusCode}`);
      }
    }

    // Second request OK (limit is 2)
    res = await app.inject({ method: "GET", url: "/x", headers });
    expect(res.statusCode).toBe(200);

    // Third request exceeds per-minute limit
    res = await app.inject({ method: "GET", url: "/x", headers });
    expect(res.statusCode).toBe(429);

    // Wait for rate limit to reset (in-memory store resets after 60s)
    vi.useFakeTimers();
    vi.advanceTimersByTime(61 * 1000);

    // Fourth request should be OK again
    res = await app.inject({ method: "GET", url: "/x", headers });
    expect(res.statusCode).toBe(200);
    vi.useRealTimers();
  });
});
