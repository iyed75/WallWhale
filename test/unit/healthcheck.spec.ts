import { describe, it, expect } from "vitest";
import { runHealthCheck } from "../../src/healthcheck.ts";

describe("healthcheck script", () => {
  it("returns a structured result", async () => {
    const result = await runHealthCheck();
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("timestamp");
  });
});
