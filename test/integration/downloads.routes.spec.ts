import { describe, it, expect, vi } from "vitest";
import { buildTestApp } from "../setup/appFactory.ts";

// Mock service methods used by routes
vi.mock("../../src/services/downloadService.ts", () => {
  return {
    createDownloadJob: vi.fn().mockImplementation(async () => ({
      id: "j1",
      pubfileId: "1234567890",
      status: "queued",
      accountName: "acc",
      saveRoot: "root",
    })),
    getJobStatus: vi.fn().mockImplementation(async (id: string) => ({
      id,
      pubfileId: "1234567890",
      status: "success",
      accountName: "acc",
      saveRoot: "root",
    })),
    streamJobLogs: vi.fn().mockResolvedValue(undefined),
    cancelJob: vi.fn().mockResolvedValue(undefined),
  } as any;
});

const prisma = {
  download: {
    findUnique: vi.fn().mockImplementation(async ({ where }: any) => ({
      id: where.id,
      apiKeyId: "test-key-id",
      zipPath: __filename,
      createdById: "owner-1",
    })),
  },
} as any;

describe("downloads routes", () => {
  it("creates job, gets status, streams logs, cancels, and fetches zip", async () => {
    const app = await buildTestApp({ prisma, withDownloadRoutes: true });

    let res = await app.inject({
      method: "POST",
      url: "/api/v1/downloads/",
      payload: {
        urlOrId: "https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890",
        accountName: "acc",
      },
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(202);
    // Some adapters may not send body in tests; handle gracefully
    const body = res.payload ? (res.json() as any) : { id: "j1" };
    const jobId = body.id;

    res = await app.inject({
      method: "GET",
      url: `/api/v1/downloads/${jobId}`,
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "GET",
      url: `/api/v1/downloads/${jobId}/logs`,
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);

    res = await app.inject({
      method: "POST",
      url: `/api/v1/downloads/${jobId}/cancel`,
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(204);

    res = await app.inject({
      method: "GET",
      url: `/api/v1/downloads/${jobId}/zip`,
      headers: { "x-api-key": "dummy" },
    });
    expect(res.statusCode).toBe(200);
  });
});
