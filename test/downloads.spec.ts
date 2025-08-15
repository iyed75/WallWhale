import { describe, it, expect, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { PassThrough } from "node:stream";
import fsExtra from "node:fs";

// Mock child_process at module scope so ESM import picks it up
vi.mock("node:child_process", async () => {
  const { EventEmitter } = await import("node:events");
  const { PassThrough } = await import("node:stream");
  return {
    spawn: () => {
      const emitter: any = new EventEmitter();
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      emitter.stdout = stdout;
      emitter.stderr = stderr;
      emitter.pid = 12345;
      queueMicrotask(() => {
        stdout.write("Starting download\n");
        stdout.write("Progress...\n");
        stdout.end();
        stderr.end();
        emitter.emit("close", 0);
      });
      return emitter;
    },
  } as any;
});

// Utility to wait for a condition with timeout
async function waitFor(fn: () => boolean | Promise<boolean>, ms = 5000, step = 50) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, step));
  }
  return false;
}

describe("downloads", () => {
  it("creates a job for the Steam URL and produces a zip", async () => {
    // Arrange env before dynamic import of the service
    const tmpRoot = path.join(os.tmpdir(), `dds-tests-${Date.now()}`);
    process.env.NODE_ENV = "test";
    process.env.SAVE_ROOT = tmpRoot;
    process.env.STEAM_ACCOUNTS = JSON.stringify([{ name: "test", username: "u", password: "p" }]);
    // Default REQUIRE_SUBPATH fits our target path

    // child_process mocked at module scope above

    // Create a fake DepotDownloader executable file so existsSync passes
    const fakeExe = path.join(process.cwd(), "test-depot-downloader.exe");
    fsExtra.writeFileSync(fakeExe, "echo");
    process.env.DEPOTDOWNLOADER_PATH = fakeExe;

    // Dynamic import after env is set so the parsed env picks it up
    const svc = await import("../src/services/downloadService.ts");

    // Minimal fake Fastify instance with prisma subset used by the service
    const fakePrisma = {
      apiKey: {
        findUnique: vi.fn().mockResolvedValue({
          id: "api-key-1",
          ownerId: "user-1",
          maxRuntimeSeconds: null,
        }),
      },
      download: {
        create: vi.fn().mockResolvedValue({ id: "job-1" }),
        update: vi.fn().mockResolvedValue({}),
      },
      steamUser: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            username: "u",
            encryptedPassword: Buffer.from("p").toString("base64"),
          }),
      },
    } as any;
    const fakeApp = {
      prisma: fakePrisma,
      log: { info: () => {}, error: () => {}, warn: () => {} },
      audit: { log: async () => {} },
    } as any;

    // Act: create a job with the given Steam URL
    const url = "https://steamcommunity.com/sharedfiles/filedetails/?id=2234989491";
    const job = await svc.createDownloadJob({
      urlOrId: url,
      accountName: "test",
      apiKeyId: "api-key-1",
      app: fakeApp,
    });

    // Stream logs live as the job runs
    const logs: string[] = [];
    let logDone: () => void;
    const logPromise = new Promise<void>((resolve) => (logDone = resolve));
    const fakeRes: any = {
      write(chunk: string) {
        for (const line of chunk.split(/\r?\n/)) {
          if (line.startsWith("data: ")) logs.push(line.slice(6));
        }
      },
      end() {
        logDone();
      },
      on(event: string, cb: () => void) {
        if (event === "close") {
          // immediately invoke close cleanup after end
          const origEnd = this.end.bind(this);
          this.end = () => {
            origEnd();
            cb();
          };
        }
      },
    };
    // Start streaming logs (do not await)
    void svc.streamJobLogs(job.id, fakeRes as any);

    // Await job completion
    const ok = await waitFor(
      async () => {
        const js = await svc.getJobStatus(job.id);
        return js?.status === "success";
      },
      8000,
      100
    );
    expect(ok).toBe(true);

    // Wait for logs to finish streaming
    await logPromise;
    // Print logs for test output
    // eslint-disable-next-line no-console
    console.log("\n--- Download logs ---\n" + logs.join("\n") + "\n--- End logs ---\n");

    // Assert zip exists and is non-empty
    const zipPath = path.join(
      tmpRoot,
      "projects",
      "myprojects",
      "2234989491",
      "..",
      "2234989491.zip"
    );
    const zipResolved = path.resolve(zipPath);
    expect(fs.existsSync(zipResolved)).toBe(true);
    const stat = await fsp.stat(zipResolved);
    expect(stat.size).toBeGreaterThan(0);
  }, 15000);
});
