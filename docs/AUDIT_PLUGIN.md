# Audit plugin (src/plugins/audit.ts)

This document explains the audit plugin implemented at `src/plugins/audit.ts` which decorates Fastify with an `audit` logger and records server lifecycle and selected request events.

## Purpose

- Provide a central audit logger (`AuditLogger`) available as `fastify.audit`.
- Emit important lifecycle events (server started, server stopped) to the audit log.
- Optionally record request-level audit events for sensitive routes (admin/auth).

## What it does

- Instantiates `new AuditLogger(fastify)` and decorates the Fastify instance with `fastify.decorate('audit', auditLogger)`.
- On `onReady`, calls `auditLogger.log({ action: SERVER_STARTED, details: {...} })` to record startup.
- On `onClose`, calls `auditLogger.log({ action: SERVER_STOPPED, details: {...} })` to record shutdown.
- Adds an `onResponse` hook that records `ACCESS_DENIED` audit entries for admin/auth routes that returned an error status (>= 400).

## Security & privacy

- Audit logs may contain request metadata. Ensure PII and secrets are omitted or redacted. The plugin is careful to only log limited info for request audits (e.g., user-agent) and focuses on admin/auth routes.
- Restrict access to audit logs (admin endpoints) and monitor for unusual access.

## Recommendations

- Configure retention and archival for audit logs (e.g., ship to central logging or SIEM).
- Use structured fields (timestamp, action, apiKeyId, ip, userAgent, details) to facilitate queries and alerts.
- Ensure `AuditLogger` implementation sanitizes sensitive fields before persistence.

---

Would you like a short doc for the `AuditLogger` implementation in `src/utils/audit.ts` next?
