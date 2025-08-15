# Route registration (src/routes/register.ts)

This file centralizes API routing by registering versioned route groups.

## Purpose

- Compose and mount route modules under their API prefixes.
- Keep application bootstrap simple by moving route wiring into one file.

## Behavior

- Registers `downloadRoutes` under `/api/v1/downloads`.
- Registers `adminRoutes` under `/api/v1/admin`.

## Recommendations

- Use this file to register future route modules (metrics, health, admin, etc.) and to apply per-group hooks or authentication where needed.
- For documented APIs, ensure route registration order and prefixes match documentation (e.g., OpenAPI generation uses these paths).

---

Next steps: I can document `src/utils/audit.ts` (AuditLogger) or continue documenting the remaining routes/plugins.
