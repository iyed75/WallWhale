import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { encryptPassword } from "../../utils/crypto.js";
import { AUDIT_ACTIONS } from "../../utils/audit.js";

function requireAdmin(req: any, reply: any) {
  const scopes = req.apiKey?.scopes || [];
  if (!scopes.includes("admin:*"))
    return reply.forbidden("Admin scope required");
}

export async function adminRoutes(fastify: FastifyInstance) {
  // TypeBox schemas for request validation
  const CreateApiKeySchema = Type.Object({
    name: Type.String(),
    scopes: Type.Array(Type.String(), {
      default: ["download:read", "download:write"],
    }),
    rateLimit: Type.Optional(Type.Integer({ minimum: 1 })),
    quotaDaily: Type.Optional(Type.Integer({ minimum: 1 })),
    quotaMonthly: Type.Optional(Type.Integer({ minimum: 1 })),
    expiresAt: Type.Optional(Type.String({ format: "date-time" })),
    maxConcurrent: Type.Optional(Type.Integer({ minimum: 1 })),
    maxRuntimeSeconds: Type.Optional(Type.Integer({ minimum: 1 })),
    meta: Type.Optional(Type.String()),
    ownerId: Type.Optional(Type.String()),
  });

  const CreateUserSchema = Type.Object({
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 6 }),
    role: Type.Union([Type.Literal("ADMIN"), Type.Literal("USER")]),
  });

  const CreateSteamUserSchema = Type.Object({
    username: Type.String(),
    password: Type.String(),
    displayName: Type.Optional(Type.String()),
    status: Type.Optional(
      Type.Union([
        Type.Literal("ACTIVE"),
        Type.Literal("BANNED"),
        Type.Literal("INACTIVE"),
      ])
    ),
    meta: Type.Optional(Type.String()),
  });

  const UpdateSteamUserSchema = Type.Object({
    username: Type.Optional(Type.String()),
    password: Type.Optional(Type.String()),
    displayName: Type.Optional(Type.String()),
    status: Type.Optional(
      Type.Union([
        Type.Literal("ACTIVE"),
        Type.Literal("BANNED"),
        Type.Literal("INACTIVE"),
      ])
    ),
    meta: Type.Optional(Type.String()),
  });

  // Response schemas
  const ApiKeyResponseSchema = Type.Object({
    id: Type.String(),
    key: Type.String(),
    name: Type.String(),
    scopes: Type.Array(Type.String()),
    rateLimit: Type.Union([Type.Number(), Type.Null()]),
    quotaDaily: Type.Union([Type.Number(), Type.Null()]),
    quotaMonthly: Type.Union([Type.Number(), Type.Null()]),
    expiresAt: Type.Union([Type.String(), Type.Null()]),
    maxConcurrent: Type.Union([Type.Number(), Type.Null()]),
    maxRuntimeSeconds: Type.Union([Type.Number(), Type.Null()]),
    meta: Type.Union([Type.String(), Type.Null()]),
    isActive: Type.Boolean(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  });

  const SteamUserResponseSchema = Type.Object({
    id: Type.String(),
    username: Type.String(),
    displayName: Type.Union([Type.String(), Type.Null()]),
    status: Type.String(),
    meta: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  });

  const UserResponseSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    role: Type.String(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  });

  // =============================================================================
  // API KEYS MANAGEMENT
  // =============================================================================

  fastify.get(
    "/keys",
    {
      schema: {
        summary: "List all API keys",
        description: "Get all API keys in the system",
        tags: ["Admin", "API Keys"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        response: {
          200: Type.Array(ApiKeyResponseSchema),
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);

      // Audit log - admin accessed API keys list
      await fastify.audit.logRequest(
        req,
        AUDIT_ACTIONS.ADMIN_DATA_ACCESSED,
        200,
        {
          resource: "api_keys",
          action: "list",
        }
      );

      const keys = await fastify.prisma.apiKey.findMany({
        include: { scopes: true, owner: true },
      });

      // Transform the data to match the response schema
      const transformedKeys = keys.map((key) => ({
        id: key.id,
        key: key.key,
        name: key.name,
        scopes: key.scopes?.map((s) => s.name) || [],
        rateLimit: key.rateLimit,
        quotaDaily: key.quotaDaily,
        quotaMonthly: key.quotaMonthly,
        expiresAt: key.expiresAt?.toISOString() || null,
        maxConcurrent: key.maxConcurrent,
        maxRuntimeSeconds: key.maxRuntimeSeconds,
        meta: key.meta,
        isActive:
          !key.revokedAt && (!key.expiresAt || key.expiresAt > new Date()),
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString(),
      }));

      reply.send(transformedKeys);
    }
  );

  fastify.post(
    "/keys",
    {
      schema: {
        summary: "Create new API key",
        description: "Create a new API key with specified permissions",
        tags: ["Admin", "API Keys"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        body: CreateApiKeySchema,
        response: {
          201: ApiKeyResponseSchema,
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const body = req.body as any;
      const ownerId = body.ownerId || req.apiKey!.ownerId;

      const created = await fastify.prisma.apiKey.create({
        data: {
          key:
            "key_" +
            Math.random().toString(36).slice(2, 10) +
            Date.now().toString(36),
          name: body.name,
          ownerId,
          rateLimit: body.rateLimit,
          quotaDaily: body.quotaDaily,
          quotaMonthly: body.quotaMonthly,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          maxConcurrent: body.maxConcurrent,
          maxRuntimeSeconds: body.maxRuntimeSeconds,
          meta: body.meta,
          scopes: {
            create: (body.scopes || ["download:read", "download:write"]).map(
              (s: string) => ({ name: s })
            ),
          },
        },
        include: { scopes: true },
      });

      // Transform the created key to match the response schema
      const transformedKey = {
        id: created.id,
        key: created.key,
        name: created.name,
        scopes: created.scopes?.map((s) => s.name) || [],
        rateLimit: created.rateLimit,
        quotaDaily: created.quotaDaily,
        quotaMonthly: created.quotaMonthly,
        expiresAt: created.expiresAt?.toISOString() || null,
        maxConcurrent: created.maxConcurrent,
        maxRuntimeSeconds: created.maxRuntimeSeconds,
        meta: created.meta,
        isActive:
          !created.revokedAt &&
          (!created.expiresAt || created.expiresAt > new Date()),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      // Audit log - API key created
      await fastify.audit.logRequest(req, AUDIT_ACTIONS.API_KEY_CREATED, 201, {
        apiKeyId: created.id,
        apiKeyName: created.name,
        scopes: created.scopes?.map((s) => s.name) || [],
        ownerId: created.ownerId,
      });

      reply.code(201).send(transformedKey);
    }
  );

  fastify.delete(
    "/keys/:id",
    {
      schema: {
        summary: "Revoke API key",
        description: "Revoke an API key by setting revokedAt timestamp",
        tags: ["Admin", "API Keys"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        params: Type.Object({
          id: Type.String({ description: "API key ID" }),
        }),
        response: {
          204: Type.Null(),
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const { id } = req.params as { id: string };

      // Get the API key before revoking for audit log
      const apiKey = await fastify.prisma.apiKey.findUnique({
        where: { id },
        include: { scopes: true },
      });

      await fastify.prisma.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      // Audit log - API key revoked
      await fastify.audit.logRequest(req, AUDIT_ACTIONS.API_KEY_REVOKED, 204, {
        apiKeyId: id,
        apiKeyName: apiKey?.name,
        scopes: apiKey?.scopes?.map((s) => s.name) || [],
      });

      reply.code(204).send();
    }
  );

  fastify.post(
    "/keys/:id/regenerate",
    {
      schema: {
        summary: "Regenerate API key",
        description: "Generate a new key value for an existing API key",
        tags: ["Admin", "API Keys"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        params: Type.Object({
          id: Type.String({ description: "API key ID" }),
        }),
        response: {
          200: ApiKeyResponseSchema,
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const { id } = req.params as { id: string };
      const key =
        "key_" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      const updated = await fastify.prisma.apiKey.update({
        where: { id },
        data: { key },
        include: { scopes: true },
      });

      // Transform the updated key to match the response schema
      const transformedKey = {
        id: updated.id,
        key: updated.key,
        name: updated.name,
        scopes: updated.scopes?.map((s) => s.name) || [],
        rateLimit: updated.rateLimit,
        quotaDaily: updated.quotaDaily,
        quotaMonthly: updated.quotaMonthly,
        expiresAt: updated.expiresAt?.toISOString() || null,
        maxConcurrent: updated.maxConcurrent,
        maxRuntimeSeconds: updated.maxRuntimeSeconds,
        meta: updated.meta,
        isActive:
          !updated.revokedAt &&
          (!updated.expiresAt || updated.expiresAt > new Date()),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      // Audit log - API key regenerated
      await fastify.audit.logRequest(
        req,
        AUDIT_ACTIONS.API_KEY_REGENERATED,
        200,
        {
          apiKeyId: updated.id,
          apiKeyName: updated.name,
          scopes: updated.scopes?.map((s) => s.name) || [],
        }
      );

      reply.send(transformedKey);
    }
  );

  // =============================================================================
  // STEAM USERS MANAGEMENT
  // =============================================================================

  fastify.get(
    "/steam-users",
    {
      schema: {
        summary: "List all Steam users",
        description: "Get all Steam user accounts (passwords excluded)",
        tags: ["Admin", "Steam Users"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        response: {
          200: Type.Array(SteamUserResponseSchema),
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);

      // Audit log - admin accessed Steam users list
      await fastify.audit.logRequest(
        req,
        AUDIT_ACTIONS.ADMIN_DATA_ACCESSED,
        200,
        {
          resource: "steam_users",
          action: "list",
        }
      );

      const steamUsers = await fastify.prisma.steamUser.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          status: true,
          meta: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      reply.send(steamUsers);
    }
  );

  fastify.post(
    "/steam-users",
    {
      schema: {
        summary: "Add Steam user account",
        description: "Create a new Steam user account with encrypted password",
        tags: ["Admin", "Steam Users"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        body: CreateSteamUserSchema,
        response: {
          201: SteamUserResponseSchema,
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const body = req.body as any;

      // Encrypt the password before storing
      const encryptedPassword = encryptPassword(body.password);

      const created = await fastify.prisma.steamUser.create({
        data: {
          name: body.username,
          username: body.username,
          encryptedPassword,
          displayName: body.displayName,
          status: body.status || "ACTIVE",
          meta: body.meta,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          status: true,
          meta: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Audit log - Steam user created
      await fastify.audit.logRequest(
        req,
        AUDIT_ACTIONS.STEAM_USER_CREATED,
        201,
        {
          steamUserId: created.id,
          username: created.username,
          displayName: created.displayName,
          status: created.status,
        }
      );

      reply.code(201).send(created);
    }
  );

  fastify.put(
    "/steam-users/:id",
    {
      schema: {
        summary: "Update Steam user account",
        description:
          "Update Steam user account details. Password will be re-encrypted if provided.",
        tags: ["Admin", "Steam Users"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        params: Type.Object({
          id: Type.String({ description: "Steam user ID" }),
        }),
        body: UpdateSteamUserSchema,
        response: {
          200: SteamUserResponseSchema,
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const { id } = req.params as { id: string };
      const body = req.body as any;

      const updateData: any = {};

      if (body.username) updateData.username = body.username;
      if (body.password)
        updateData.encryptedPassword = encryptPassword(body.password);
      if (body.displayName !== undefined)
        updateData.displayName = body.displayName;
      if (body.status) updateData.status = body.status;
      if (body.meta !== undefined) updateData.meta = body.meta;

      const updated = await fastify.prisma.steamUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          displayName: true,
          status: true,
          meta: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      reply.send(updated);
    }
  );

  fastify.delete(
    "/steam-users/:id",
    {
      schema: {
        summary: "Delete Steam user account",
        description: "Permanently delete a Steam user account",
        tags: ["Admin", "Steam Users"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        params: Type.Object({
          id: Type.String({ description: "Steam user ID" }),
        }),
        response: {
          204: Type.Null(),
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const { id } = req.params as { id: string };

      await fastify.prisma.steamUser.delete({
        where: { id },
      });

      reply.code(204).send();
    }
  );

  // =============================================================================
  // USERS MANAGEMENT
  // =============================================================================

  fastify.get(
    "/users",
    {
      schema: {
        summary: "List all users",
        description: "Get all system users",
        tags: ["Admin", "Users"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        response: {
          200: Type.Array(UserResponseSchema),
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);

      // Audit log - admin accessed users list
      await fastify.audit.logRequest(
        req,
        AUDIT_ACTIONS.ADMIN_DATA_ACCESSED,
        200,
        {
          resource: "users",
          action: "list",
        }
      );

      const users = await fastify.prisma.user.findMany();
      reply.send(users);
    }
  );

  fastify.post(
    "/users",
    {
      schema: {
        summary: "Create new user",
        description: "Create a new system user account",
        tags: ["Admin", "Users"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        body: CreateUserSchema,
        response: {
          201: UserResponseSchema,
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const body = req.body as any;
      const created = await fastify.prisma.user.create({ data: body });

      // Audit log - user created
      await fastify.audit.logRequest(req, AUDIT_ACTIONS.USER_CREATED, 201, {
        userId: created.id,
        email: created.email,
        role: created.role,
      });

      reply.code(201).send(created);
    }
  );

  // =============================================================================
  // AUDIT LOGS
  // =============================================================================

  fastify.get(
    "/audit",
    {
      schema: {
        summary: "Get audit logs",
        description: "Retrieve recent audit log entries",
        tags: ["Admin", "Audit"],
        headers: Type.Object({
          "x-api-key": Type.String({
            description: "API key with admin:* scope",
            examples: ["key_abc123def456"],
          }),
        }),
        querystring: Type.Object({
          limit: Type.Optional(
            Type.Integer({ minimum: 1, maximum: 1000, default: 200 })
          ),
        }),
        response: {
          200: Type.Array(
            Type.Object({
              id: Type.String(),
              action: Type.String(),
              details: Type.Any(),
              createdAt: Type.String(),
            })
          ),
        },
      },
    },
    async (req, reply) => {
      requireAdmin(req, reply);
      const { limit = 200 } = req.query as any;

      // Audit log - admin accessed audit logs
      await fastify.audit.logRequest(
        req,
        AUDIT_ACTIONS.AUDIT_LOGS_ACCESSED,
        200,
        {
          limit,
        }
      );

      const logs = await (fastify.prisma as any).auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      reply.send(logs);
    }
  );
}
