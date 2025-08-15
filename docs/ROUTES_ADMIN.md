# Admin API routes (src/routes/v1/admin.ts)

This document describes the administrative HTTP endpoints exposed by `src/routes/v1/admin.ts` for managing API keys, Steam accounts, users, and audit logs.

All endpoints require an API key with the `admin:*` scope. Caller IP is subject to the global allow/deny lists configured by `IP_ALLOW_LIST` and `IP_DENY_LIST`.

## API Keys

### GET /keys
List all API keys.
- Response: 200 array of keys with metadata (id, key, name, scopes, rateLimit, quotas, expiration, active status).
- Notes: Returns the raw key value (`key`) in the response; ensure this endpoint is protected and audited.

### POST /keys
Create a new API key.
- Body: name, scopes, rateLimit, quotaDaily, quotaMonthly, expiresAt, maxConcurrent, maxRuntimeSeconds, meta, ownerId (optional).
- Response: 201 created key object with the generated key string.
- Notes: The route generates a key value and persists it. The created key is returned once — store it securely.

### DELETE /keys/:id
Revoke an API key by setting `revokedAt`.
- Response: 204 No Content.
- Notes: Action is audited.

### POST /keys/:id/regenerate
Rotate the raw key for an existing API key record.
- Response: 200 with updated key object containing the new raw key string.
- Notes: Old key is replaced — inform the owner and update dependent systems.

## Steam Users

### GET /steam-users
List installed Steam accounts (passwords excluded).
- Response: 200 array of steam user metadata.

### POST /steam-users
Create a Steam account.
- Body: username, password, displayName?, status?, meta?
- Behavior: Password is encrypted via `encryptPassword` before storing.
- Response: 201 created steam user metadata (password not returned).
- Notes: Use strong encryption secrets and follow `docs/CRYPTO.md` for migration guidance.

### PUT /steam-users/:id
Update a Steam user. If `password` is provided it will be re-encrypted and stored.
- Response: 200 updated steam user metadata.

### DELETE /steam-users/:id
Delete a Steam user permanently.
- Response: 204 No Content.
- Notes: Consider soft-delete for auditability if you require historical traces.

## Users

### GET /users
List system users.
- Response: 200 array of user objects (id, email, role, timestamps).

### POST /users
Create a system user (admin or user role).
- Body: `{ email, password, role }`.
- Response: 201 created user object.

## Audit Logs

### GET /audit?limit=200
Retrieve recent audit log entries.
- Querystring: `limit` (1–1000, default 200)
- Response: 200 array of audit entries ordered descending by creation time.
- Notes: Access to audit logs is audited itself.

## Security Notes

- All admin endpoints require `admin:*` scope — protect the access keys carefully.
- API key values are included in responses for creation/regeneration — treat them as secrets and transmit/store securely.
- Consider adding multi-factor protection or an allowlist for admin endpoints to further reduce risk.
- Consider rate-limiting admin endpoints separately and adding stricter logging and alerting on these actions.

## Example: create Steam user

```bash
curl -X POST https://api.example.com/v1/admin/steam-users \
  -H "x-api-key: <ADMIN_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"username":"steam_user","password":"super-secret-password","displayName":"Primary"}'
```

---

Which file should I document next? Options: `src/plugins/prisma.ts`, `src/utils/depotDownloader.ts` (already documented), or `src/utils/directDownload.ts` (already documented).
