# Prisma plugin (src/plugins/prisma.ts)

This document explains the Fastify Prisma plugin which wires a `PrismaClient` instance into the Fastify app and manages lifecycle events.

## Purpose

- Create and connect a `PrismaClient` when the Fastify server starts.
- Decorate the `FastifyInstance` with a `prisma` property for use in routes and services.
- Disconnect Prisma cleanly during server shutdown.

## Implementation details

- The plugin creates `const prisma = new PrismaClient()` and immediately calls `await prisma.$connect()` to establish the connection pool.
- It calls `app.decorate('prisma', prisma)` so `fastify.prisma` becomes available throughout the application.
- It registers an `onClose` hook to disconnect Prisma during shutdown: `await instance.prisma.$disconnect()`.

## Usage

Anywhere in the code you can access the Prisma client via the Fastify instance:

```ts
const users = await fastify.prisma.user.findMany();
```

The plugin's type augmentation ensures `fastify.prisma` is typed as `PrismaClient`.

## Operational recommendations

- Connection pooling: `PrismaClient` maintains its own pool. For serverless or short-lived processes, consider `prisma.$disconnect()` after each request or use the connection-less approach recommended in Prisma docs.
- Graceful shutdown: The plugin registers an `onClose` hook, but ensure your process manager calls Fastify's `close()` during application shutdown so Prisma disconnects cleanly.
- Monitoring: Expose DB health checks (e.g., `SELECT 1`) or use Prisma's `$connect`/`$disconnect` to verify connectivity during deploys.
- Migrations: Keep migrations under `prisma/migrations`. Use `prisma migrate deploy` in CI/CD, not at runtime.

## Edge cases

- If `$connect()` fails at startup, the Fastify boot process will fail. Ensure DB credentials in `DATABASE_URL` are correct and the DB is reachable during startup.
- For horizontally scaled deployments, ensure connection limits from the DB (Postgres) are respected by tuning Prisma and DB pool sizes.

## Tests to add

- Integration test to verify `fastify.prisma` is available in routes and plugins.
- Startup test to simulate DB connection failure and assert a sane error message.

---

Which file next? I can document `src/plugins/register.ts`, `src/routes/register.ts`, or `src/plugins/audit.ts`.
