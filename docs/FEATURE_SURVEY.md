# WallWhale Server Feature Survey

Use this checklist to specify exactly what you want in the TypeScript web server that wraps your current Python-based DepotDownloader workflow.

Mark each item as Yes/No and add notes where helpful. If unsure, leave blank.

## 1) Core Goals
- Purpose of the server (single sentence): A web server to manage and monitor downloads using DepotDownloader
- Internal use only or public-facing? Open source for self-hosting
- Expected concurrent users: 50 max
- Target OS/runtime (Windows-only vs cross-platform): Cross-platform

## 2) Runtime & Stack
- Runtime: Node.js LTS (Yes/No) Yes
- Language: TypeScript (Yes/No) Yes
- Framework: Express / Fastify / Hono / NestJS (pick one) Fastify
- Process manager: PM2 / Docker / Windows Service (pick one) Docker
- Logging: pino / winston / console only (pick one) pino
- Env config: dotenv (.env) (Yes/No) Yes for starting but able to use an onboarding process for production that fills out what is not configured

## 3) API Design
- REST endpoints (Yes/No) Yes
- OpenAPI/Swagger docs (Yes/No) Yes
- Versioned routes (e.g., /api/v1) (Yes/No) Yes
- Request validation (zod/yup/express-validator) (Yes/No + which) Yes (zod)
- Error format standardization (Yes/No) Yes
- Pagination/sorting conventions (Yes/No) Yes

## 4) Authentication & Authorization
- API key auth (Yes/No) Yes
- Admin vs user roles (Yes/No) Yes -> only one admin user -> configured on onboarding / .env 
- Permissions per route (Yes/No) No
- API key scopes (download:read, download:write, admin:*) (Yes/No) yes
- Key rotation & expiration (Yes/No) optional for every key
- IP allow/deny lists (Yes/No) Yes

## 5) API Keys Management (Admin)
- Create/revoke/list keys (Yes/No) Yes
- Regenerate secret (Yes/No) Yes
- Set per-key rate limits (Yes/No) yes
- Set per-key usage quotas (daily/monthly) (Yes/No) yes
- Key metadata (owner, notes, tags) (Yes/No) yes
- Audit logs for key usage (Yes/No) yes

## 6) Download Jobs & Workflow
- Create download job from workshop URL or pubfileid (Yes/No) Yes
- Validate that save_location contains projects/myprojects (Yes/No) Yes
- Per-job status: queued, running, success, failed (Yes/No) Yes
- Stream logs from job (server-sent events or websockets) (Yes/No) Yes
- Concurrent job limit (global and per-key) (Yes/No) Yes
- Retry policy on failure (Yes/No) Yes
- Cancel running job (Yes/No) Yes
- Max runtime per job (Yes/No) Per key basis
- zipping of the folder downloaded (Yes/No) Yes
- sending back download progress updates (Yes/No) Yes
- support for resuming interrupted downloads (Yes/No) Yes
- support for downloading files from the server to the client (Yes/No) Yes - only for downloads made by the same user

## 7) Steam/DepotDownloader Integration
- Configure Steam accounts and passwords via env/DB (Yes/No) Yes
- Select account per job (Yes/No) Yes
- Store secrets securely (not in repo) (Yes/No) Yes
- Mask secrets in logs (Yes/No) Yes
- Verify target directories and create if missing (Yes/No) Yes
- Windows CREATE_NO_WINDOW flag behavior (Yes/No) Yes

## 8) Data Model (Prisma-ready)
- Entities (initial): ApiKey, Download, User/Admin, JobLog (Yes/No) Yes
- Relations: ApiKey 1..* Download (Yes/No) Yes
- Track who created each job (Yes/No) Yes
- Soft delete for records (Yes/No) Yes
- Timestamps (createdAt/updatedAt) (Yes/No) Yes

## 9) Rate Limiting & Quotas
- Global rate limit (Yes/No + values) no
- Per-IP rate limit (Yes/No) no
- Per-API-key rate limit (Yes/No) yes
- Burst vs sustained limits (Yes/No) no
- Usage quotas (per day/week/month) (Yes/No) no

## 10) Admin Endpoints
- CRUD for API keys (Yes/No) yes
- CRUD for users/admins (Yes/No) yes
- View/download job list and status (Yes/No) yes
- Retry/cancel jobs (Yes/No) yes
- System health and metrics (Yes/No) yes
- Audit log search/export (Yes/No) yes

## 11) Observability & Ops
- Structured logs (Yes/No) yes
- Request tracing/correlation IDs (Yes/No) yes
- Metrics: Prometheus/StatsD (Yes/No) yes
- Health checks (liveness/readiness) (Yes/No) yes
- Admin UI (basic) (Yes/No) yes

## 12) Storage & DB
- Database: SQLite (dev), PostgreSQL (prod) (Yes/No) yes
- ORM: Prisma (Yes/No) yes
- Migrations included (Yes/No) yes
- Seed scripts for dev (Yes/No) yes 

## 13) Security
- HTTPS (behind reverse proxy or built-in TLS) (pick) built-in
- Helmet/cors settings (Yes/No) yes
- Input sanitization (Yes/No) yes
- Secure headers and no sensitive data in errors (Yes/No) yes

## 14) Filesystem & Paths
- Save location configured via env/DB (Yes/No) Yes or onboarding
- Validate required subfolders (projects/myprojects) (Yes/No) No
- Auto-create missing directories (Yes/No) Yes
- Windows path normalization/escaping (Yes/No) Yes

## 15) Client & Frontend
- Next.js planned frontend (Yes/No)  Not yet but will be made so prepare for it
- API-first with OpenAPI client generation (Yes/No) yes
- CORS configuration for local dev (Yes/No) yes

## 16) Testing & QA
- Unit tests for services (Yes/No) yes
- Integration tests for routes (supertest) (Yes/No) yes
- Mock for DepotDownloader process (Yes/No) yes
- Minimal e2e happy path (Yes/No) yes

## 17) Deployment
- Single binary via pkg / Docker image / Node runtime (pick) Docker image and Node runtime for development
- Windows service install script (Yes/No) Yes - for production deployments on Windows servers
- Container orchestration support (k8s/docker-compose) (Yes/No) Yes - docker-compose for easy deployment
- CI pipeline (lint/test/build) (Yes/No) Yes - GitHub Actions or similar

## 18) Nice-to-haves
- Web UI for logs/stream (Yes/No) Yes will be done in future with next.js
- Websocket/SSE live console (Yes/No) Yes
- Admin dashboard (Yes/No) Will be implemented in future with next.js
- Email/webhook notifications on job completion (Yes/No) No
- Multi-tenant separation (Yes/No) No


---

Return the completed checklist. Based on your answers, I’ll scaffold the server with the agreed features, Prisma-ready models, and admin/API key management.
