# Environment and configuration (src/utils/env.ts)

This document explains the environment schema, validation logic, helper functions, and runtime behaviors implemented in `src/utils/env.ts`.

## Purpose

- Validate runtime configuration using Zod.
- Provide a typed `env` object for the rest of the codebase.
- Offer helpers for common environment-related tasks (decoding stored passwords, showing warnings, production checks, CORS parsing, configuration summary).

## What it validates

`EnvSchema` covers a wide range of settings such as:

- Application metadata: `APP_NAME`, `APP_VERSION`, `APP_DESCRIPTION`.
- Server: `PORT`, `HOST`, `NODE_ENV`.
- Admin bootstrap: `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- Storage and DepotDownloader paths: `SAVE_ROOT`, `REQUIRE_SUBPATH`, `DEPOTDOWNLOADER_PATH`.
- Security: `JWT_SECRET`, `API_KEY_SALT`, `BCRYPT_ROUNDS`.
- Network: `IP_ALLOW_LIST`, `IP_DENY_LIST`, `CORS_ORIGINS`.
- TLS: `TLS_ENABLE`, `TLS_KEY_PATH`, `TLS_CERT_PATH`.
- Database: `DATABASE_URL`.
- Concurrency & limits: `GLOBAL_CONCURRENCY`, `PER_KEY_CONCURRENCY`, `MAX_UPLOAD_SIZE`, `REQUEST_TIMEOUT`.
- Rate limiting, monitoring, Redis, SMTP, webhooks, cleanup policies, documentation flags, etc.

Many entries have sensible defaults for local development but require secure values in production (e.g., `JWT_SECRET`, `API_KEY_SALT`).

## Initialization behavior

1. The module attempts to parse `process.env` through `EnvSchema`.
2. If parsing succeeds, `parsedEnv` is exported as `env` and `environmentIssues` remains false.
3. If parsing fails and the process looks like a setup command (detected by `isSetupCommand()`), the module prints warnings and attempts to parse again with safe defaults (`safeDefaults`). If that fails, a minimal fallback configuration object is used so setup can continue.
4. If parsing fails and this is not a setup command, the process exits with a helpful error message and guidance to run the setup.

Why this matters
- This approach prevents hard failures during `npm run setup` while ensuring strict validation for normal runs.
- During setup, developers can still run the interactive setup with warnings rather than fatal crashes.

## Exported values and helpers

- `export const env`: the parsed, typed environment object for use across the app.
- `export const environmentIssues`: boolean flag indicating if initial validation failed.
- `export type SteamAccount`: Zod-inferred type for Steam account config.
- `export type Environment`: Zod-inferred type for the environment schema.

Helper functions
- `decodePassword(pw: string): string`
  - Accepts either a plain string or a `base64:...` formatted value and returns the decoded password.
  - Throws if base64 decoding fails.

- `showEnvironmentWarnings(): void`
  - If `environmentIssues` is true, prints a short set of warnings instructing the user to run the setup.

- `validateProductionConfig(): void`
  - Checks that production-critical secrets are configured (`JWT_SECRET`, `API_KEY_SALT`) and that TLS cert/key are present when TLS is enabled. Exits the process on failure.

- `getCorsOrigins(): string[] | boolean`
  - Parses `CORS_ORIGINS`. Returns `true` when `*` is set (allow all), otherwise returns a trimmed array of the origins.

- `getConfigSummary(): object`
  - Returns a small structured summary of important settings (app, server, features, limits), useful for startup logs.

## Edge cases & recommendations

- Defaults: Many development-friendly defaults are present. Ensure you supply production-grade secrets before running in production.
- Secret lengths: `JWT_SECRET` requires at least 32 characters, `API_KEY_SALT` at least 16. The module blocks startup in production if these remain default/weak values.
- Setup mode: The module detects `setup`, `quick-setup`, `check`, or arguments containing `setup`/`cert` as signals to relax validation and continue with safe defaults.
- Decoding passwords: The `decodePassword` function expects the `base64:` prefix to decode; other formats are treated as plaintext.

## Usage

Anywhere in the project import the typed config:

```ts
import { env, showEnvironmentWarnings, validateProductionConfig } from "../src/utils/env";

console.log(`Starting ${env.APP_NAME}@${env.APP_VERSION} in ${env.NODE_ENV}`);
showEnvironmentWarnings();
validateProductionConfig();
```

## Where to improve

- Consider extracting secrets to a secure provider (Key Vault / Secrets Manager) rather than environment variables.
- For large deployments, split configuration into logical groups and load secrets lazily.
- Add unit tests around the schema to ensure future changes don't accidentally weaken validations.

---

If you want, I can now add a short section in `docs/SECURITY.md` referencing the `ENCRYPTION_SECRET`, `JWT_SECRET`, and recommended secret management practices.
