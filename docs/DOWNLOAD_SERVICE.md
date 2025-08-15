# Download service (src/services/downloadService.ts)

This document explains the server-side download orchestration implemented in `src/services/downloadService.ts`.

It covers the job lifecycle, public functions, concurrency policies, persistence, logging, and operational notes.

## Purpose

- Provide a managed, asynchronous system for queuing and running DepotDownloader-based download jobs.
- Stream logs and progress to clients while jobs run.
- Persist job metadata and results to the database (using Prisma).
- Enforce per-API-key concurrency and optional runtime limits.
- Emit audit events for important lifecycle changes.

## Public API

- `createDownloadJob({ urlOrId, accountName, saveRoot, apiKeyId, app }) : Promise<Job>`
  - Validates the Workshop URL or ID, creates a job entry (in-memory and DB), starts the job asynchronously (via `queueMicrotask`) and returns the job metadata.
  - Persists a `download` record with status `QUEUED` and logs an audit event `DOWNLOAD_STARTED`.

- `getJobStatus(jobId: string) : Promise<Job | undefined>`
  - Returns the in-memory job state (status, timestamps, error if any).

- `streamJobLogs(jobId: string, res: NodeJS.WritableStream) : Promise<void>`
  - Streams server-side logs for the requested job as an SSE-like stream. Handles job-not-found, already-ended streams, and cleans up listeners when the client disconnects.

- `cancelJob(jobId: string) : Promise<void>`
  - Attempts to terminate the spawned DepotDownloader process. On Windows it uses `taskkill`, otherwise `SIGTERM`. Writes a cancellation message to the job's log stream (if present).

## Internal behavior (runJob)

`runJob(app, jobId, pubfileId, accountName, targetDir, apiKeyId)` is the main worker function that:

1. Loads the Steam account from the database by `name`. If missing, marks the job failed and writes an error to logs.
2. Decrypts the stored Steam password using `decryptPassword`.
3. Validates the target save path (there is a disabled check against `env.REQUIRE_SUBPATH` — currently set to `if (!targetDir.includes(required) && false)` so the check is effectively off).
4. Enforces per-API-key concurrency:
   - Looks up the `apiKey` record from the DB for `maxConcurrent` and `maxRuntimeSeconds`.
   - Uses an in-memory `keyActiveCounts` map to track active jobs per `apiKeyId`.
   - If the current active count >= allowed, the job fails immediately with a concurrency error.
5. Updates the job status to `running`, sets `startedAt`, persists `RUNNING` status to DB, and logs the start.
6. Locates the DepotDownloader binary via `getDepotDownloaderPath()` and fails with an error if not present.
7. Spawns the DepotDownloader child process with necessary args (`-app 431960 -pubfile <id> -verify-all -username <user> -password <pw> -dir <target>`), writes process stdout/stderr to the job's `PassThrough` log stream and keeps the child process reference in `processes` map for cancellation.
8. If `maxRuntimeSeconds` is specified for the API key, a timer is set that kills the process if it exceeds the maximum runtime.
9. Upon process exit:
   - If `code === 0` (success):
     - The job is marked `success` and an archive is created via `zipDirectory`.
     - If zip succeeds, DB record updated to `SUCCESS` with `zipPath`, audit log `DOWNLOAD_COMPLETED`, and temporary download folder removed.
     - If zip creation fails, job fails, DB updated to `FAILED`, and audit log `DOWNLOAD_FAILED` with `archive_creation_failed` reason.
   - If `code !== 0` (failure):
     - The job is marked `failed`; DB updated to `FAILED` and audit `DOWNLOAD_FAILED` with `process_failed` reason.
10. The job's log stream is ended, child process is removed from `processes`, and the per-key active count is decremented.

## Data model (in-code)

`Job` (in-memory object):
- `id` (UUID)
- `pubfileId` (Steam Workshop ID)
- `status` (`queued` | `running` | `success` | `failed` | `canceled`)
- `accountName` (string)
- `saveRoot` (string)
- `startedAt?`, `finishedAt?` (timestamps)
- `error?` (string)

Persistence: the service mirrors state to a Prisma `download` table with statuses like `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED` and stores `zipPath`, `startedAt`, `finishedAt`, `error` as appropriate.

## Logging and auditing

- Each job gets a `PassThrough` log stream stored in `logStreams` keyed by job id. Real-time output from the DepotDownloader process is piped into this stream.
- The server logs job lifecycle events using `app.log` and stores audit events via `app.audit.log(...)` for `DOWNLOAD_STARTED`, `DOWNLOAD_COMPLETED`, and `DOWNLOAD_FAILED`.
- The log streaming endpoint uses SSE-style `data:` framing so clients can present live logs.

## Concurrency & limits

- Global concurrency control: currently basic and in-memory per-API-key counting is used via `keyActiveCounts` map. This is suitable for single-process deployments.
- Per-API key limits: The API key DB record may hold `maxConcurrent` (and `maxRuntimeSeconds`) which the service respects.
- Note: For multi-instance deployments (multiple processes or containers), this in-memory approach must be replaced by distributed coordination (Redis, database locks, or a queue service).

## Error modes & recovery

- Missing Steam account: job fails early with a clear error message.
- DepotDownloader missing: job fails early; remedy is to install the binary or set `DEPOTDOWNLOADER_PATH`.
- Process errors: non-zero exit code results in logged stderr and job failure with recorded exit code.
- Archive creation failure: job fails after process success but zip missing/creation fails.
- Concurrency violation: job fails if API key active jobs >= `maxConcurrent`.

## Security considerations

- Password handling: the plaintext Steam password is obtained by `decryptPassword` from the DB before launching the external process. The code ensures the password is not logged in full (args logged filter out the password) but care should be taken to avoid leaks in other logs or child process environments.
- Process isolation: running DepotDownloader spawns OS processes that access the disk and network. Consider running downloads in restricted containers or chroot/jails in high-security environments.

## Operational recommendations

- Use a job queue (Redis-backed or message queue) for multi-instance reliability and horizontal scaling.
- Move concurrency counts and job state to the DB or Redis so multiple nodes share the same view.
- Add graceful shutdown handling to terminate running child processes and persist job state.
- Add exponential backoff and retries for transient failures (e.g., network hiccups) with a retry policy that updates job metadata.
- Add health checks for DepotDownloader presence and expose metrics for job success/failure rates and active job counts.

## Example usage (Fastify route)

```ts
// POST /v1/downloads
const job = await createDownloadJob({
  urlOrId: "https://steamcommunity.com/sharedfiles/filedetails/?id=123456789",
  accountName: "default",
  saveRoot: "/data/downloads",
  apiKeyId: request.headers['x-api-key'] as string,
  app: fastify,
});
return job;
```

## Tests to add

- Unit tests for `extractId` regex and edge cases.
- Integration tests that mock `spawn` to simulate success/failure and assert DB/audit changes.
- Concurrency tests to verify per-key limits and decrementing logic.
- Tests for log streaming that assert SSE framing correctness.

---

Tell me the next file to document and I'll continue adding `docs/<FILE>.md` entries. If you'd like, I can also add a short `docs/SETUP.md` snippet to describe how to install DepotDownloader binaries for common platforms and how to set `DEPOTDOWNLOADER_PATH`.
