# Downloads API routes (src/routes/v1/downloads.ts)

This document explains the HTTP endpoints exposed by `src/routes/v1/downloads.ts` and how to use them.

Base path: `/v1/downloads`

## Endpoints

### POST /
Create a download job.

- Permissions: API key must include `download:write` or `download:*` scope.
- Request body:
  - `urlOrId: string` — Steam Workshop URL or numeric ID.
  - `accountName: string` — Steam account name (configured in the DB).
  - `saveRoot?: string` — Optional custom save root. The handler validates `saveRoot` contains the literal `projects` (basic check).
- Response: `202 Accepted` with `Job` metadata.

Example:
```bash
curl -X POST https://api.example.com/v1/downloads \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"urlOrId":"https://steamcommunity.com/sharedfiles/filedetails/?id=123456789","accountName":"default"}'
```

### GET /:id
Get job status.

- Permissions: any valid API key (authentication is required but no special scopes)
- Response: `200` with `Job` object or `404` if not found.

### GET /:id/logs
Stream job logs (SSE).

- Permissions: any valid API key.
- Response: `200` with `text/event-stream`.
- Behavior: Streams the job's live stdout/stderr output. Connection should be kept open until job completion. The stream uses simple SSE framing (`data:` lines).

Example (server-sent events client):
```js
const es = new EventSource('https://api.example.com/v1/downloads/<jobId>/logs', { headers: { Authorization: 'Bearer <API_KEY>' } });
es.onmessage = (e) => console.log(e.data);
```

### POST /:id/cancel
Cancel a running job.

- Permissions: requires `download:write` or `download:*` scope.
- Response: `204 No Content` on request dispatched.
- Behavior: Attempts to terminate the underlying DepotDownloader process (uses `taskkill` on Windows or `SIGTERM` otherwise).

### GET /:id/zip
Download the job's ZIP archive.

- Permissions: requires `download:read` or `download:*` scope.
- Response: Streams the `application/zip` file with `Content-Disposition` set to the archive filename; `404` if not found or not owned by the same API key that requested the zip.
- Security: Only the API key that created the job (stored in `download.apiKeyId`) can retrieve the zip; this prevents cross-key access to zips.

## Error cases & status codes

- `400 Bad Request` — validation failures (e.g., invalid `saveRoot`).
- `401 Unauthorized` — missing or invalid API key.
- `403 Forbidden` — insufficient scopes or IP restrictions.
- `404 Not Found` — job or zip missing.
- `429 Too Many Requests` — per-key rate limit or quota exceeded.
- `500 Internal Server Error` — unexpected failures (check server logs and job logs).

## Notes & best practices

- Use the `stream logs` endpoint to get live feedback before the job finishes. The final archive appears after the job completes and the server creates the ZIP.
- The route enforces that `zip` downloads are only accessible to the creating API key — if you need admin access consider implementing an admin route to retrieve zips across keys with proper authorization checks.
- Consider implementing signed short-lived URLs for large file transfers if you plan to distribute archives to external clients.

---

Would you like me to document the corresponding admin routes next (`src/routes/v1/admin.ts`), or the Prisma plugin (`src/plugins/prisma.ts`)?
