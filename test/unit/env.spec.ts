import { describe, it, expect, vi } from "vitest";

describe("env utils", () => {
  it("getCorsOrigins returns true for *", async () => {
    vi.resetModules();
    vi.stubEnv("CORS_ORIGINS", "*");
    const mod = await import("../../src/utils/env.ts");
    const { getCorsOrigins } = mod;
    expect(getCorsOrigins()).toBe(true);
  });

  it("getCorsOrigins splits comma list", async () => {
    vi.resetModules();
    vi.stubEnv("CORS_ORIGINS", "https://a.com, https://b.com");
    const mod = await import("../../src/utils/env.ts");
    const { getCorsOrigins } = mod;
    expect(getCorsOrigins()).toEqual(["https://a.com", "https://b.com"]);
  });
});
