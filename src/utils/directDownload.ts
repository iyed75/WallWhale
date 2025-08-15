/**
 * Direct Download Utility
 *
 * Handles downloading Steam Workshop files directly to local PC
 * without using the API server infrastructure.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { existsSync, createWriteStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import archiver from "archiver";
import chalk from "chalk";
import { env } from "./env.js";
import { getDepotDownloaderPath } from "./depotDownloader.js";

export interface DirectDownloadOptions {
  urlOrId: string;
  accountName: string;
  outputPath: string;
  createZip?: boolean; // defaults to true
  cleanup?: boolean; // defaults to true
  onProgress?: (message: string) => void;
}

export interface DirectDownloadResult {
  outputPath: string;
  zipPath?: string;
  size?: string;
  duration: number;
}

/**
 * Extract Steam Workshop ID from URL or return ID if already numeric
 */
function extractId(input: string): string | null {
  const match = input.match(/\b\d{8,12}\b/);
  return match ? match[0] : null;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
  }

  return totalSize;
}

/**
 * Create ZIP archive from directory
 */
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

/**
 * Get Steam account credentials from database (matches downloadService.ts approach)
 */
async function getSteamCredentials(
  accountName: string
): Promise<{ username: string; password: string }> {
  // Import crypto utility and Prisma client - matches the main service
  const { PrismaClient } = await import("@prisma/client");
  const { decryptPassword } = await import("./crypto.js");

  const prisma = new PrismaClient();

  try {
    // Get Steam account from database - exact same query as downloadService.ts
    const acct = await prisma.steamUser.findFirst({
      where: { name: accountName },
    });

    if (!acct) {
      throw new Error(
        `Steam account '${accountName}' not found in database. Available accounts can be seen in the seed file.`
      );
    }

    // Decrypt password (stored passwords are AES-256-GCM encrypted) - same as downloadService.ts
    const password = decryptPassword(acct.encryptedPassword);

    return {
      username: acct.username, // Use acct.username like the main service
      password,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Download Steam Workshop file directly to local PC
 */
export async function directDownload(
  options: DirectDownloadOptions
): Promise<DirectDownloadResult> {
  const startTime = Date.now();

  // Set defaults for options
  const createZip = options.createZip !== false; // default true
  const cleanup = options.cleanup !== false; // default true

  // Extract Workshop ID
  const id = extractId(options.urlOrId);
  if (!id) {
    throw new Error("Invalid Steam Workshop URL or ID");
  }

  // Get Steam credentials
  const credentials = await getSteamCredentials(options.accountName);

  // Setup paths
  const outputDir = path.resolve(options.outputPath);
  const tempDir = path.join(os.tmpdir(), `depot-download-${randomUUID()}`);
  const targetDir = path.join(tempDir, id);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(targetDir, { recursive: true });

  // Verify DepotDownloader exists
  const depotPath = getDepotDownloaderPath();
  if (!existsSync(depotPath)) {
    throw new Error(`DepotDownloader executable not found: ${depotPath}`);
  }

  // Build DepotDownloader arguments
  console.log(chalk.cyan("🔍 Preparing DepotDownloader arguments..."));
  console.log(`Using DepotDownloader: ${depotPath}`);
  const args = [
    "-app",
    "431960",
    "-pubfile",
    id,
    "-verify-all",
    "-username",
    credentials.username,
    "-password",
    credentials.password,
    "-dir",
    targetDir,
  ];
  console.log(`DepotDownloader arguments: ${args.join(" ")}`);
  // Execute DepotDownloader
  console.log(chalk.cyan("🎯 Executing DepotDownloader..."));

  const depotProcess = spawn(getDepotDownloaderPath(), args, {
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";
  let currentProgress = "";

  depotProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    stdout += output;

    // Process each line and display relevant information
    const lines = output.split("\n");
    lines.forEach((line: string) => {
      const cleanLine = line.trim();

      if (!cleanLine) return;

      // Handle progress lines with percentages
      const progressMatch = cleanLine.match(/(\d+\.\d+)%/);
      if (progressMatch) {
        const percentage = progressMatch[1];
        const newProgress = `Downloading... ${percentage}%`;
        if (newProgress !== currentProgress) {
          process.stdout.write(`\r${chalk.yellow("📥")} ${newProgress}`);
          currentProgress = newProgress;
        }
        return;
      }

      // Handle specific status messages
      if (cleanLine.includes("Connecting to Steam3")) {
        console.log(`${chalk.blue("🔗")} Connecting to Steam...`);
      } else if (cleanLine.includes("Logging") && cleanLine.includes("into Steam3")) {
        console.log(`${chalk.blue("🔐")} Authenticating user...`);
      } else if (cleanLine.includes("Done!")) {
        console.log(`${chalk.green("✅")} Authentication successful`);
      } else if (cleanLine.includes("Got AppInfo")) {
        console.log(`${chalk.cyan("📋")} Retrieved application info`);
      } else if (cleanLine.includes("Got depot key")) {
        console.log(`${chalk.cyan("🔑")} Obtained depot access key`);
      } else if (cleanLine.includes("Processing depot")) {
        console.log(`${chalk.yellow("⚡")} Processing depot files...`);
      } else if (cleanLine.includes("Downloading depot") && !cleanLine.includes("manifest")) {
        console.log(`${chalk.yellow("📦")} Starting file download...`);
      } else if (cleanLine.includes("Pre-allocating")) {
        // Skip pre-allocation messages for cleaner output
      } else if (cleanLine.includes("Total downloaded")) {
        if (currentProgress) {
          process.stdout.write("\n"); // End the progress line
          currentProgress = "";
        }
        console.log(`${chalk.green("📊")} ${cleanLine}`);
      } else if (cleanLine.includes("Disconnected from Steam")) {
        console.log(`${chalk.gray("🔌")} Disconnected from Steam`);
      }
    });
  });

  depotProcess.stderr?.on("data", (data) => {
    const output = data.toString();
    stderr += output;

    // Display error lines
    const lines = output.split("\n");
    lines.forEach((line: string) => {
      const cleanLine = line.trim();
      if (cleanLine) {
        console.log(`${chalk.red("❌")} ${cleanLine}`);
      }
    });
  });

  // Wait for process to complete
  const exitCode = await new Promise<number>((resolve) => {
    depotProcess.on("close", (code) => {
      if (currentProgress) {
        process.stdout.write("\n"); // End any progress line
      }
      console.log(`${chalk.blue("🏁")} Process completed with exit code ${code || 0}`);
      resolve(code || 0);
    });
  });

  if (exitCode !== 0) {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.error("DepotDownloader stdout:", stdout);
    console.error("DepotDownloader stderr:", stderr);
    throw new Error(
      `DepotDownloader failed with exit code ${exitCode}. Check console output above for details.`
    );
  }

  console.log(chalk.green("📁 Processing downloaded files..."));

  // Find the actual downloaded content (DepotDownloader creates nested directories)
  let contentDir = targetDir;
  try {
    const entries = await fs.readdir(targetDir);
    if (entries.length === 1 && entries[0]) {
      const potentialContentDir = path.join(targetDir, entries[0]);
      const stat = await fs.stat(potentialContentDir);
      if (stat.isDirectory()) {
        contentDir = potentialContentDir;
      }
    }
  } catch {
    // Use original target dir if we can't find nested content
  }

  // Calculate download size
  let downloadSize = await getDirectorySize(contentDir);

  // Move content to final output directory
  const finalOutputDir = path.join(outputDir, `workshop_${id}`);

  // Remove existing directory if it exists
  if (existsSync(finalOutputDir)) {
    await fs.rm(finalOutputDir, { recursive: true, force: true });
  }

  await fs.rename(contentDir, finalOutputDir);

  let zipPath: string | undefined;

  // Create ZIP archive if requested
  if (createZip) {
    console.log(chalk.yellow("📦 Creating ZIP archive..."));
    zipPath = path.join(outputDir, `workshop_${id}.zip`);
    // find the zip size:
    downloadSize = await getDirectorySize(finalOutputDir);
    await zipDirectory(finalOutputDir, zipPath);

    // Remove directory if cleanup is enabled and zip was created
    if (cleanup) {
      await fs.rm(finalOutputDir, { recursive: true, force: true });
    }
  }

  // Cleanup temporary directory
  await fs.rm(tempDir, { recursive: true, force: true });

  const duration = Date.now() - startTime;

  return {
    outputPath: zipPath && cleanup ? zipPath : finalOutputDir,
    zipPath,
    size: formatFileSize(downloadSize),
    duration,
  };
}
