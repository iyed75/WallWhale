/**
 * File Hosting Utility
 *
 * Downloads Steam Workshop files and hosts them via a simple HTTP server
 * for easy sharing and distribution.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import fs from "node:fs/promises";
import { existsSync, createReadStream, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import os from "node:os";
import { directDownload } from "./directDownload.js";
import chalk from "chalk";

export interface FileHostingOptions {
  ids: string[];
  accountName: string;
  port: number;
  host: string;
  password?: string;
  expireHours: number;
  ssl: boolean;
  onProgress?: (message: string) => void;
}

export interface HostedFile {
  id: string;
  name: string;
  path: string;
  size: string;
  downloadUrl: string;
}

export interface FileHostingResult {
  url: string;
  files: HostedFile[];
  qrCode?: string;
  expireAt: Date;
}

interface HostingSession {
  id: string;
  files: HostedFile[];
  password?: string;
  expireAt: Date;
  downloadDir: string;
}

const activeSessions = new Map<string, HostingSession>();

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
 * Get file size
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Generate a clean, professional HTML page for file listing with countdown
 */
function generateFileListingHTML(session: HostingSession, baseUrl: string): string {
  const hasExpiration = session.expireAt.getTime() > Date.now() + 1000; // More than 1 second from now

  const filesHTML = session.files
    .map(
      (file) => `
    <div class="file-item">
      <div class="file-info">
        <h3>${file.name}</h3>
        <p><strong>Size:</strong> ${file.size}</p>
        <p><strong>Workshop ID:</strong> ${file.id}</p>
      </div>
      <a href="${file.downloadUrl}" class="download-btn" download>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download
      </a>
    </div>
  `
    )
    .join("");

  const totalSizeMB = session.files.reduce((total, file) => {
    const sizeStr = file.size.replace(/[^\d.]/g, "");
    return total + parseFloat(sizeStr) || 0;
  }, 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steam Workshop Downloads</title>
    <style>
/* Workshop Downloads Page Styles - Clean and Professional */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  background-color: #fafafa;
  color: #0f172a;
  line-height: 1.6;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.header p {
  font-size: 1.125rem;
  color: #64748b;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.status-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.status-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  display: block;
}

.status-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.countdown-card {
  background: #fef3c7;
  border: 1px solid #f59e0b;
}

.countdown-card .status-value {
  color: #92400e;
}

.countdown-card .status-label {
  color: #a16207;
}

.files-grid {
  display: grid;
  gap: 1rem;
}

.file-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease-in-out;
}

.file-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.file-info h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.file-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.download-btn {
  background-color: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease-in-out;
}

.download-btn:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

.footer p {
  margin-bottom: 0.5rem;
}

.never-expires {
  background: #dcfce7;
  border: 1px solid #16a34a;
}

.never-expires .status-value {
  color: #15803d;
}

.never-expires .status-label {
  color: #166534;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .header h1 {
    font-size: 2rem;
  }
  
  .file-item {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
}

.countdown-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Steam Workshop Downloads</h1>
            <p>High-quality workshop content ready for download</p>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <span class="status-value">${session.files.length}</span>
                <div class="status-label">Available Files</div>
            </div>
            <div class="status-card">
                <span class="status-value">${totalSizeMB.toFixed(1)}</span>
                <div class="status-label">Total MB</div>
            </div>
            <div class="status-card">
                <span class="status-value">✓</span>
                <div class="status-label">Ready</div>
            </div>
            ${
              hasExpiration
                ? `
            <div class="status-card countdown-card countdown-pulse">
                <span class="status-value" id="countdown">--:--:--</span>
                <div class="status-label">Time Remaining</div>
            </div>
            `
                : `
            <div class="status-card never-expires">
                <span class="status-value">∞</span>
                <div class="status-label">Never Expires</div>
            </div>
            `
            }
        </div>
        
        <div class="files-grid">
            ${filesHTML}
        </div>
        
        <div class="footer">
            <p><strong>💡 Tip:</strong> Right-click and "Save As" to download files</p>
            <p>🔒 Secure temporary hosting${hasExpiration ? " • Files auto-expire for privacy" : " • Files hosted indefinitely"}</p>
        </div>
    </div>

    ${
      hasExpiration
        ? `
    <script>
        const expireTime = new Date('${session.expireAt.toISOString()}');
        
        function updateCountdown() {
            const now = new Date();
            const timeLeft = expireTime - now;
            
            if (timeLeft <= 0) {
                document.getElementById('countdown').textContent = 'EXPIRED';
                return;
            }
            
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            document.getElementById('countdown').textContent = 
                \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    </script>
    `
        : ""
    }
</body>
</html>
  `.trim();
}

/**
 * Handle password authentication
 */
function handlePasswordAuth(req: IncomingMessage, res: ServerResponse, password: string): boolean {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const providedPassword = url.searchParams.get("password");

  if (providedPassword !== password) {
    res.writeHead(401, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Password Protected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
          .form { background: white; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          input[type="password"] { padding: 10px; margin: 10px; border: 1px solid #ddd; border-radius: 4px; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="form">
          <h2>🔒 Password Required</h2>
          <p>This download area is password protected.</p>
          <form onsubmit="window.location.href = '/?password=' + document.getElementById('pwd').value; return false;">
            <input type="password" id="pwd" placeholder="Enter password" required>
            <br>
            <button type="submit">Access Files</button>
          </form>
        </div>
      </body>
      </html>
    `);
    return false;
  }

  return true;
}

/**
 * Create and start file hosting server
 */
export async function hostFiles(options: FileHostingOptions): Promise<FileHostingResult> {
  const sessionId = randomUUID();
  const downloadDir = path.join(os.tmpdir(), `workshop-hosting-${sessionId}`);
  const expireAt =
    options.expireHours > 0
      ? new Date(Date.now() + options.expireHours * 60 * 60 * 1000)
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years = never expires

  options.onProgress?.("Creating hosting environment...");
  await fs.mkdir(downloadDir, { recursive: true });

  const hostedFiles: HostedFile[] = [];

  // Download all requested files
  for (let i = 0; i < options.ids.length; i++) {
    const id = options.ids[i];
    if (!id) continue; // Skip undefined values

    options.onProgress?.(`Starting download ${i + 1}/${options.ids.length}: ${id}`);
    console.log(chalk.blue(`\n📦 Downloading Workshop ID: ${id} (${i + 1}/${options.ids.length})`));
    console.log(chalk.gray("━".repeat(60)));

    try {
      const result = await directDownload({
        urlOrId: id,
        accountName: options.accountName,
        outputPath: downloadDir,
        createZip: true,
        cleanup: true,
        // Remove onProgress to avoid interference with subprocess output
      });

      if (result.zipPath && existsSync(result.zipPath)) {
        const fileSize = await getFileSize(result.zipPath);

        hostedFiles.push({
          id,
          name: `Workshop_${id}.zip`,
          path: result.zipPath,
          size: formatFileSize(fileSize),
          downloadUrl: `/download/${id}`,
        });

        console.log(chalk.green(`✅ Successfully downloaded: ${result.size}\n`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Failed to download ${id}: ${error}\n`));
      options.onProgress?.(`Failed to download ${id}: ${error}`);
    }
  }

  if (hostedFiles.length === 0) {
    throw new Error("No files were successfully downloaded");
  }

  // Create hosting session
  const session: HostingSession = {
    id: sessionId,
    files: hostedFiles,
    password: options.password,
    expireAt,
    downloadDir,
  };

  activeSessions.set(sessionId, session);

  // Create HTTP server
  options.onProgress?.("Starting web server...");

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Handle password protection
      if (session.password && !handlePasswordAuth(req, res, session.password)) {
        return;
      }

      // Handle file downloads
      if (url.pathname.startsWith("/download/")) {
        const fileId = url.pathname.replace("/download/", "");
        const file = session.files.find((f) => f.id === fileId);

        if (!file || !existsSync(file.path)) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("File not found");
          return;
        }

        const stat = statSync(file.path);
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": stat.size.toString(),
          "Content-Disposition": `attachment; filename="${file.name}"`,
        });

        const stream = createReadStream(file.path);
        stream.pipe(res);
        return;
      }

      // Handle main page
      if (url.pathname === "/" || url.pathname === "") {
        const baseUrl = `http${options.ssl ? "s" : ""}://${options.host}:${options.port}`;
        const html = generateFileListingHTML(session, baseUrl);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }

      // 404 for other routes
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal server error");
    }
  });

  // Start server
  await new Promise<void>((resolve, reject) => {
    server.listen(options.port, options.host, () => {
      resolve();
    });

    server.on("error", reject);
  });

  // Generate QR code for mobile access (removed for now)
  let qrCodeData: string | undefined;
  // QR code generation would require additional dependency

  const baseUrl = `http${options.ssl ? "s" : ""}://${options.host === "0.0.0.0" ? "localhost" : options.host}:${options.port}`;

  // Set up auto-cleanup only if expiration is set
  if (options.expireHours > 0) {
    setTimeout(
      async () => {
        try {
          server.close();
          activeSessions.delete(sessionId);
          await fs.rm(downloadDir, { recursive: true, force: true });
        } catch {
          // Cleanup failed, but that's okay
        }
      },
      options.expireHours * 60 * 60 * 1000
    );
  }

  return {
    url: baseUrl,
    files: hostedFiles,
    qrCode: qrCodeData,
    expireAt,
  };
}
