import { describe, it, expect, vi } from "vitest";
import { AuditLogger } from "../../src/utils/audit.ts";

const makeApp = () =>
  ({
    prisma: { auditLog: { create: vi.fn().mockResolvedValue({}) } },
    log: { info: vi.fn(), error: vi.fn() },
  }) as any;

describe("AuditLogger", () => {
  it("writes to prisma and app.log", async () => {
    const app = makeApp();
    const logger = new AuditLogger(app);
    await logger.log({ action: "test.action", details: { foo: "bar" } });
    expect(app.prisma.auditLog.create).toHaveBeenCalled();
    expect(app.log.info).toHaveBeenCalled();
  });
});
