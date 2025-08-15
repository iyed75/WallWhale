import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { env } from "../utils/env.js";
import { decryptPassword } from "../utils/crypto.js";
import { getDepotDownloaderPath } from "../utils/depotDownloader.js";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import { existsSync, createWriteStream } from "node:fs";
import * as difflib from "difflib";
import { AUDIT_ACTIONS } from "../utils/audit.js";

export type Job = {
  id: string;
  pubfileId: string;
  status: "queued" | "running" | "success" | "failed" | "canceled";
  accountName: string;
  saveRoot: string;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
};

const jobs = new Map<string, Job>();
const logStreams = new Map<string, PassThrough>();
const processes = new Map<string, ReturnType<typeof spawn>>();
const keyActiveCounts = new Map<string, number>();

function extractId(input: string): string | null {
  const match = input.match(/\b\d{8,12}\b/);
  return match ? match[0] : null;
}

export async function createDownloadJob({
  urlOrId,
  accountName,
  saveRoot,
  apiKeyId,
  app,
}: {
  urlOrId: string;
  accountName: string;
  saveRoot?: string;
  apiKeyId: string;
  app: FastifyInstance;
}) {
  const id = extractId(urlOrId);
  if (!id) throw new Error("Invalid url or id");

  const saveBase = saveRoot ?? env.SAVE_ROOT;
  const target = path.join(saveBase, "projects", "myprojects", id);

  const job: Job = {
    id: randomUUID(),
    pubfileId: id,
    status: "queued",
    accountName,
    saveRoot: saveBase,
  };
  jobs.set(job.id, job);
  const log = new PassThrough();
  logStreams.set(job.id, log);

  // Log job creation
  app.log.info(
    {
      jobId: job.id,
      pubfileId: id,
      accountName,
      saveRoot: saveBase,
    },
    "Download job created and queued"
  );

  // Persist to DB
  const createdById = await reqUserId(app, apiKeyId);
  const download = await app.prisma.download.create({
    data: {
      id: job.id,
      pubfileId: id,
      status: "QUEUED",
      saveRoot: saveBase,
      accountName,
      createdById,
      apiKeyId,
    },
  });

  // Audit log - download job created
  await app.audit.log({
    action: AUDIT_ACTIONS.DOWNLOAD_STARTED,
    apiKeyId,
    details: {
      jobId: job.id,
      pubfileId: id,
      accountName,
      saveRoot: saveBase,
    },
  });

  queueMicrotask(() => runJob(app, job.id, id, accountName, target, apiKeyId));
  return job;
}

export async function getJobStatus(jobId: string) {
  return jobs.get(jobId);
}

export async function streamJobLogs(jobId: string, res: NodeJS.WritableStream) {
  const stream = logStreams.get(jobId);
  if (!stream) {
    res.write("event: end\n");
    res.write("data: Job not found\n\n");
    res.end();
    return;
  }
  // If the log stream already ended, immediately notify and close
  if ((stream as any).readableEnded) {
    res.write("event: end\n");
    res.write("data: Job finished\n\n");
    res.end();
    return;
  }
  const onData = (chunk: Buffer) => {
    res.write(`data: ${chunk.toString().replace(/\n/g, "\ndata: ")}\n\n`);
  };
  stream.on("data", onData);
  const onEnd = () => {
    res.write("event: end\n");
    res.write("data: Job finished\n\n");
    res.end();
    stream.off("end", onEnd);
  };
  stream.once("end", onEnd);
  const onClose = () => {
    stream.off("data", onData);
    stream.off("end", onEnd);
  };
  (res as any).on("close", onClose);
}

export async function cancelJob(jobId: string) {
  const p = processes.get(jobId);
  if (p) {
    const job = jobs.get(jobId);
    const log = logStreams.get(jobId);

    if (os.platform() === "win32") {
      spawn("taskkill", ["/f", "/t", "/pid", String(p.pid)]);
    } else {
      p.kill("SIGTERM");
    }

    // Note: We don't have access to app.log here, but we can log to the job stream
    if (log) {
      log.write("Job cancellation requested by user\n");
    }
  }
}

function reqUserId(app: FastifyInstance, apiKeyId: string) {
  // Look up owner of api key
  return app.prisma.apiKey.findUnique({ where: { id: apiKeyId } }).then((k) => k?.ownerId || "");
}

async function runJob(
  app: FastifyInstance,
  jobId: string,
  pubfileId: string,
  accountName: string,
  targetDir: string,
  apiKeyId: string
) {
  const job = jobs.get(jobId)!;
  const log = logStreams.get(jobId)!;

  // Get Steam account from database instead of env
  const acct = await app.prisma.steamUser.findFirst({
    where: { name: accountName },
  });
  if (!acct) {
    job.status = "failed";
    job.error = "Steam account not found in database";
    app.log.error({ jobId, accountName }, "Steam account not found in database");
    log.write("ERROR: Steam account not found in database\n");
    log.end();
    return;
  }
  app.log.info({ jobId, accountName }, "Steam account located in database");
  // Decrypt password (stored passwords are AES-256-GCM encrypted)
  const password = decryptPassword(acct.encryptedPassword);

  // Validate target path
  const required = env.REQUIRE_SUBPATH.replace(/\\/g, path.sep);
  if (!targetDir.includes(required) && false) {
    job.status = "failed";
    job.error = `Invalid save location: must include ${env.REQUIRE_SUBPATH}`;
    log.write(job.error + "\n");
    log.end();
    return;
  }

  // Enforce per-key concurrency
  const keyInfo = await app.prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  });
  const maxConc = (keyInfo as any)?.maxConcurrent ?? env.PER_KEY_CONCURRENCY;
  const current = keyActiveCounts.get(apiKeyId) ?? 0;
  if (current >= maxConc) {
    job.status = "failed";
    job.error = `Concurrency limit reached (${maxConc})`;
    log.write(job.error + "\n");
    log.end();
    return;
  }
  keyActiveCounts.set(apiKeyId, current + 1);
  job.status = "running";
  job.startedAt = Date.now();

  app.log.info(
    {
      jobId,
      pubfileId,
      accountName,
      concurrency: current + 1,
      maxConcurrency: maxConc,
    },
    "Download job started"
  );

  await app.prisma.download.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const exe = getDepotDownloaderPath();
  app.log.info({ jobId, executable: exe }, "Initializing DepotDownloader process");

  // check if executable exists
  if (!existsSync(exe)) {
    job.status = "failed";
    job.error = "DepotDownloader executable not found";
    app.log.error({ jobId, executable: exe }, "DepotDownloader executable not found");
    log.write("ERROR: DepotDownloader executable not found\n");
    log.end();
    return;
  }

  app.log.info({ jobId, executable: exe }, "DepotDownloader executable verified");

  const args = [
    "-app",
    "431960",
    "-pubfile",
    pubfileId,
    "-verify-all",
    "-username",
    acct.username,
    "-password",
    password,
    "-dir",
    targetDir,
  ];

  app.log.info(
    {
      jobId,
      pubfileId,
      accountName: acct.username,
      targetDir,
      args: args.filter((arg) => arg !== password), // Don't log password
    },
    "Starting DepotDownloader process"
  );

  await ensureDir(targetDir);
  const child = spawn(exe, args, {
    windowsHide: true,
  });
  processes.set(jobId, child);

  child.stdout?.on("data", (d) => {
    log.write(d);
  });
  child.stderr?.on("data", (d) => {
    log.write(d);
  });

  let timer: NodeJS.Timeout | undefined;
  const maxRuntime = (keyInfo as any)?.maxRuntimeSeconds as number | undefined;
  if (maxRuntime) {
    app.log.info({ jobId, maxRuntimeSeconds: maxRuntime }, "Job timeout configured");
    timer = setTimeout(() => {
      app.log.warn(
        { jobId, maxRuntimeSeconds: maxRuntime },
        "Job exceeded maximum runtime, terminating"
      );
      log.write(`WARNING: Maximum runtime of ${maxRuntime}s exceeded, terminating process...\n`);
      if (os.platform() === "win32") {
        spawn("taskkill", ["/f", "/t", "/pid", String(child.pid)]);
      } else {
        child.kill("SIGTERM");
      }
    }, maxRuntime * 1000);
  }

  child.on("close", async (code) => {
    job.finishedAt = Date.now();
    if (timer) clearTimeout(timer);

    if (code === 0) {
      job.status = "success";
      app.log.info({ jobId, pubfileId, code }, "DepotDownloader process completed successfully");
      log.write("Download completed successfully\n");

      // Zip the downloaded directory
      const zipPath = path.join(targetDir, "..", `${pubfileId}.zip`);
      await zipDirectory(targetDir, zipPath);

      if (existsSync(zipPath)) {
        app.log.info({ jobId, zipPath }, "Archive created successfully");
        log.write(`Archive created: ${zipPath}\n`);

        await app.prisma.download.update({
          where: { id: jobId },
          data: { status: "SUCCESS", finishedAt: new Date(), zipPath },
        });

        // Audit log - download completed successfully
        await app.audit.log({
          action: AUDIT_ACTIONS.DOWNLOAD_COMPLETED,
          apiKeyId,
          details: {
            jobId,
            pubfileId,
            zipPath,
            duration: Date.now() - job.startedAt!,
          },
        });

        // Remove temporary folder and keep only the zip
        await fs.rm(targetDir, { recursive: true, force: true });
        app.log.info({ jobId, targetDir }, "Temporary download folder cleaned up");
        log.write(`Temporary folder cleaned up: ${targetDir}\n`);
      } else {
        job.status = "failed";
        job.error = `Failed to create archive: ${zipPath}`;
        app.log.error({ jobId, zipPath }, "Failed to create download archive");
        log.write(`ERROR: Failed to create archive: ${zipPath}\n`);

        await app.prisma.download.update({
          where: { id: jobId },
          data: { status: "FAILED", finishedAt: new Date(), error: job.error },
        });

        // Audit log - download failed (archive creation)
        await app.audit.log({
          action: AUDIT_ACTIONS.DOWNLOAD_FAILED,
          apiKeyId,
          details: {
            jobId,
            pubfileId,
            error: job.error,
            reason: "archive_creation_failed",
          },
        });
      }
    } else {
      job.status = "failed";
      job.error = `DepotDownloader process failed with exit code ${code}`;
      app.log.error({ jobId, pubfileId, exitCode: code }, "DepotDownloader process failed");
      log.write(`ERROR: Process failed with exit code ${code}\n`);

      await app.prisma.download.update({
        where: { id: jobId },
        data: { status: "FAILED", finishedAt: new Date(), error: job.error },
      });

      // Audit log - download failed (process exit)
      await app.audit.log({
        action: AUDIT_ACTIONS.DOWNLOAD_FAILED,
        apiKeyId,
        details: {
          jobId,
          pubfileId,
          error: job.error,
          exitCode: code,
          reason: "process_failed",
        },
      });
    }
    log.end();
    processes.delete(jobId);
    keyActiveCounts.set(apiKeyId, (keyActiveCounts.get(apiKeyId) ?? 1) - 1);
  });
}

async function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", (err: any) => reject(err));
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
