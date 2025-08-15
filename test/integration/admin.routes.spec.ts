import { describe, it, expect, vi } from "vitest";
import { buildTestApp } from "../setup/appFactory.ts";

vi.mock("../../src/utils/env.js", () => ({
  env: {
    ENCRYPTION_SECRET: "a-super-secret-key-for-testing-123",
  },
}));

vi.mock("../../src/utils/env.js", () => ({
  env: {
    ENCRYPTION_SECRET: "a-super-secret-key-for-testing-123",
  },
}));

vi.mock("../../src/utils/env.js", () => ({
  env: {
    ENCRYPTION_SECRET: "a-super-secret-key-for-testing-123",
  },
}));

const prisma = {
  apiKey: {
    findMany: vi.fn().mockResolvedValue([
      {
        id: "id1",
        key: "key_existing",
        name: "Existing",
        scopes: [{ name: "download:read" }],
        rateLimit: null,
        quotaDaily: null,
        quotaMonthly: null,
        expiresAt: null,
        maxConcurrent: null,
        maxRuntimeSeconds: null,
        meta: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: "owner-1" },
      },
    ]),
    create: vi.fn().mockResolvedValue({
      id: "id1",
      key: "key_abc",
      name: "My Key",
      ownerId: "owner-1",
      scopes: [{ name: "download:read" }, { name: "download:write" }],
      rateLimit: null,
      quotaDaily: null,
      quotaMonthly: null,
      expiresAt: null,
      maxConcurrent: null,
      maxRuntimeSeconds: null,
      meta: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: vi.fn().mockResolvedValue({
      id: "id1",
      key: "key_new",
      name: "My Key",
      scopes: [{ name: "download:read" }, { name: "download:write" }],
      rateLimit: null,
      quotaDaily: null,
      quotaMonthly: null,
      expiresAt: null,
      maxConcurrent: null,
      maxRuntimeSeconds: null,
      meta: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findUnique: vi.fn().mockImplementation((query) => {
      if (query.where.id === "id1") {
        return {
          id: "id1",
          name: "Existing",
          scopes: [{ name: "download:read" }],
          revokedAt: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return null;
    }),
  },
  steamUser: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: "su1",
      name: "test",
      username: "test",
      displayName: null,
      status: "ACTIVE",
      meta: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: vi.fn().mockResolvedValue({
      id: "su1",
      username: "test2",
      displayName: "X",
      status: "ACTIVE",
      meta: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    delete: vi.fn().mockResolvedValue({}),
  },
  user: {
    findMany: vi
      .fn()
      .mockResolvedValue([
        { id: "u1", email: "u@x.com", role: "ADMIN", createdAt: new Date(), updatedAt: new Date() },
      ]),
    create: vi.fn().mockResolvedValue({
      id: "u1",
      email: "u@x.com",
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
  auditLog: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
} as any;

describe("admin routes", () => {
  it("lists, creates, regenerates and revokes api keys", async () => {
    const app = await buildTestApp({ prisma, withAdminRoutes: true });

    let res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/keys",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/keys",
      payload: { name: "Key1", scopes: ["download:read"] },
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(201);

    res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/keys/id1/regenerate",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "DELETE",
      url: "/api/v1/admin/keys/id1",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(204);
  });

  it("manages steam users and users", async () => {
    const app = await buildTestApp({ prisma, withAdminRoutes: true });

    let res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/steam-users",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/steam-users",
      payload: { username: "test", password: "p" },
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(201);

    res = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/steam-users/su1",
      payload: { username: "test2", displayName: "X" },
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "DELETE",
      url: "/api/v1/admin/steam-users/su1",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(204);

    res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/users",
      payload: { email: "u@x.com", password: "pppppp", role: "ADMIN" },
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(201);

    res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?limit=10",
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);
  });
});
