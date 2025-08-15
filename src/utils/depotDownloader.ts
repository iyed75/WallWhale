import path from "node:path";
import fs from "node:fs";
import { env } from "./env.js";

/**
 * Get the correct DepotDownloader binary path for the current platform
 * @returns The path to the DepotDownloader executable
 */
export function getDepotDownloaderPath(): string {
  const isWindows = process.platform === "win32";

  // If DEPOTDOWNLOADER_PATH is set and exists, use it directly
  if (env.DEPOTDOWNLOADER_PATH && fs.existsSync(env.DEPOTDOWNLOADER_PATH)) {
    return env.DEPOTDOWNLOADER_PATH;
  }

  // If DEPOTDOWNLOADER_PATH points to a directory, look for the correct binary inside
  if (
    env.DEPOTDOWNLOADER_PATH &&
    fs.existsSync(env.DEPOTDOWNLOADER_PATH) &&
    fs.lstatSync(env.DEPOTDOWNLOADER_PATH).isDirectory()
  ) {
    const binaryName = isWindows ? "DepotDownloaderMod.exe" : "DepotDownloaderMod";
    const binaryPath = path.join(env.DEPOTDOWNLOADER_PATH, binaryName);
    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }
  }

  // Default base directory (from where the binaries are installed)
  const baseDir = path.join(process.cwd(), "DepotDownloaderMod");

  // Choose the correct binary based on platform
  const binaryName = isWindows ? "DepotDownloaderMod.exe" : "DepotDownloaderMod";
  const binaryPath = path.join(baseDir, binaryName);

  // Verify the binary exists
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `DepotDownloader binary not found at ${binaryPath}. ` +
        `Please run the setup wizard to install DepotDownloader for your platform.`
    );
  }

  return binaryPath;
}

/**
 * Check if DepotDownloader is available for the current platform
 * @returns true if the binary exists, false otherwise
 */
export function isDepotDownloaderAvailable(): boolean {
  try {
    getDepotDownloaderPath();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the expected binary name for the current platform
 * @returns The binary name (with or without .exe extension)
 */
export function getDepotDownloaderBinaryName(): string {
  return process.platform === "win32" ? "DepotDownloaderMod.exe" : "DepotDownloaderMod";
}

/**
 * Get the default DepotDownloader path based on platform and deployment type
 * @param isDocker Whether this is for Docker deployment
 * @returns The default path for the DepotDownloader binary
 */
export function getDefaultDepotDownloaderPath(isDocker: boolean = false): string {
  const binaryName = getDepotDownloaderBinaryName();

  if (isDocker) {
    return `/app/DepotDownloaderMod/${binaryName}`;
  } else {
    return `./DepotDownloaderMod/${binaryName}`;
  }
}
