# Authentication & API key plugin (src/plugins/auth.ts)

This document explains the Fastify plugin `src/plugins/auth.ts` which implements API key authentication, per-key rate limiting, quota tracking, and simple IP allow/deny rules.

## Purpose

- Authenticate incoming HTTP requests using API keys stored in the database (Prisma `apiKey` table).
- Enforce per-key rate limits and daily/monthly quotas.
- Attach typed claims to `FastifyRequest` for downstream handlers.
- Emit a lightweight audit log for each request.

## How it works

- The plugin registers an `onRequest` hook that runs early in the Fastify lifecycle.
- Public routes are allowed through without authentication: `/docs`, `/metrics`, health endpoints (those ending with `/health`).
- IP allow/deny lists are parsed from `process.env.IP_ALLOW_LIST` and `process.env.IP_DENY_LIST`. If `IP_DENY_LIST` contains the caller's IP, the request is rejected with `403`. If `IP_ALLOW_LIST` is non-empty and the IP isn't in it, the request is rejected with `403`.
- API keys are expected in `Authorization: Bearer <key>` or `x-api-key: <key>` header. The raw key is looked up in Prisma's `apiKey` table and must not be revoked and must not be expired.

## Rate limits & quotas

- Per-key rate limit (requests per minute): if `apiKey.rateLimit` is configured, a simple in-memory counter (`rateState` map) is used to track requests per 60s window per `apiKey.id`.
  - On exceed, the server responds `429` with `Retry-After` header.
  - This approach is only suitable for single-process deployments. For multiple instances, use Redis or a distributed rate limiter.

- Daily and monthly quotas:
  - The plugin checks `apiKey.quotaDaily` and `apiKey.quotaMonthly` against `usageDaily` and `usageMonthly` (fields in the `apiKey` table).
  - If exceeding quotas, responds `429`.
  - Usage counters (`usageDaily`, `usageMonthly`) are reset based on `usageDailyResetAt` and `usageMonthlyResetAt` fields — if missing or stale they are reset to zero and the reset time updated.
  - The plugin increments the usage counters atomically by calling `prisma.apiKey.update(...)` during the request.

## Attaching claims

- On successful authentication the plugin attaches `req.apiKey` with the shape:
  ```ts
  {
    keyId: string;
    scopes: string[]; // names from apiKey.scopes
    ownerId: string;
    rateLimit?: number;
    maxConcurrent?: number;
  }
  ```
- Downstream code (routes/services) can use `req.apiKey` to authorize actions and to enforce per-key concurrency limits (for example `downloadService` uses the `apiKeyId` when creating jobs).

## Auditing

- Each authenticated request results in an audit record (via `prisma.auditLog.create`) with minimal details: `apiKeyId`, `action: 'request'`, `ip`, `route`, and `method`.
- This provides a lightweight per-request trail without leaking sensitive data.

## Security considerations

- Keys are looked up by their raw value in the database. For stronger security, consider storing hashed key values and comparing via HMAC/constant-time compare to avoid leaking timing information. The repository already provides `hashKey` helper for hashing keys with a salt.
- The plugin uses in-memory rate-limiting state. For horizontal scaling, replace with Redis or another centralized store.
- IP allow/deny checks are simple exact-string matching. For CIDR checks use a utility library (e.g. `ipaddr.js` or `ip6`) and canonicalize forwarded IPs.
- `generateKey()` currently generates a secret but does not store the hash — make sure key creation code stores the hashed value (`hashKey`) and only returns the raw secret to the owner once.

## Operational notes

- Ensure `API_KEY_SALT` is set to a high-entropy value in production. Use `docs/ENV.md` and `docs/CONFIGURATION.md` for environment guidance.
- Monitor `auditLog` and usage counters for abuse. Consider alerting on sudden spikes in per-key usage.
- Review the `rateState` implementation for memory growth; consider TTL or periodic cleanup for stale entries.

## Example: requiring a scope in a route

```ts
fastify.get('/v1/admin/secure', async (request, reply) => {
  const scopes = request.apiKey?.scopes || [];
  if (!scopes.includes('admin:read')) return reply.code(403).send({ error: 'Insufficient scope' });
  return { ok: true };
});
```

## Tests to add

- Unit tests for missing/invalid API key behavior.
- Tests for per-key rate-limiting and quota resets spanning day/month boundaries.
- Tests for IP allow/deny logic including forwarded headers.
- Integration tests for audit log creation.

---

Tell me the next file you'd like documented and I'll continue. Suggested options: `src/routes/v1/downloads.ts`, `src/plugins/prisma.ts`, or `src/routes/v1/admin.ts`.
