# Audit logger (src/utils/audit.ts)

This document describes the `AuditLogger` utility used across the application to record structured audit events in the database and application logs.

## Purpose

- Provide a single, typed interface to record audit events (login, API key usage, admin actions, downloads, system events).
- Persist audit events to the `auditLog` table via Prisma for retention and analysis.
- Emit structured application logs (`app.log.info`) alongside DB persistence for immediate observability.

## API

- `new AuditLogger(fastify)` — construct with a Fastify instance that exposes `fastify.prisma` and `fastify.log`.
- `auditLogger.log(data: AuditLogData): Promise<void>` — write a single audit event. `AuditLogData` includes `action`, optional `userId`, `apiKeyId`, `ip`, `route`, `method`, `status`, and `details`.
- `auditLogger.logRequest(req, action, status?, details?)` — convenience method that extracts `ip`, `route`, and `method` from the Fastify `request` and logs them along with `req.user` and `req.apiKey` information if present.

## Standard actions

Constants in `AUDIT_ACTIONS` cover common events such as `LOGIN_SUCCESS`, `DOWNLOAD_STARTED`, `API_KEY_CREATED`, `SERVER_STARTED`, etc. Use these constants to standardize logged action names.

## Implementation notes

- The logger writes to the DB (`prisma.auditLog.create`) and then writes a structured log using `app.log.info` containing the same data plus optional `details` for contextual information.
- Errors during audit writing are caught and logged to avoid crashing the application.

## Security & retention

- Audit logs can contain sensitive metadata (IP addresses, API key IDs). Ensure access to the `auditLog` table and admin endpoints is restricted.
- Implement log retention and archival policies: keep recent logs onsite for quick analysis, and ship older logs to a secure archive (S3, SIEM) with strong access controls.

## Usage example

```ts
// Simple event
await fastify.audit.log({ action: AUDIT_ACTIONS.DOWNLOAD_STARTED, apiKeyId: 'key_123', details: { jobId: 'job_abc' } });

// From within a request handler
await fastify.audit.logRequest(request, AUDIT_ACTIONS.USER_CREATED, 201, { userId: created.id });
```

## Recommendations

- Use `AUDIT_ACTIONS` constants consistently to make queries and alerts easier.
- Sanitize `details` payloads to avoid storing large or sensitive blobs.
- Monitor the size of the `auditLog` table and add indexes on `action` and `createdAt` to improve query performance.

---

Which file should I document next? Options: `src/plugins/register.ts` (already documented), `src/routes/register.ts` (documented), `src/commands/setup.ts`, or `src/index.ts` (application entrypoint).
