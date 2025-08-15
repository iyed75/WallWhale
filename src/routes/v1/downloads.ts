import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import {
  createDownloadJob,
  getJobStatus,
  streamJobLogs,
  cancelJob,
} from "../../services/downloadService.js";
import path from "node:path";
import fs from "node:fs";

export async function downloadRoutes(app: FastifyInstance) {
  // Common job schema
  const JobSchema = Type.Object({
    id: Type.String(),
    pubfileId: Type.String(),
    status: Type.String(),
    accountName: Type.String(),
    saveRoot: Type.String(),
    startedAt: Type.Optional(Type.Number()),
    finishedAt: Type.Optional(Type.Number()),
    error: Type.Optional(Type.String()),
  });

  app.post(
    "/",
    {
      schema: {
        summary: "Create a download job",
        tags: ["downloads"],
        body: Type.Object({
          urlOrId: Type.String({ description: "Steam URL or file ID" }),
          accountName: Type.String({ description: "Steam account name" }),
          saveRoot: Type.Optional(
            Type.String({ description: "Custom save root (optional)" })
          ),
        }),
        headers: Type.Object({
          authorization: Type.Optional(
            Type.String({ description: "API key as Bearer token" })
          ),
          "x-api-key": Type.Optional(
            Type.String({ description: "API key as header" })
          ),
        }),
        response: {
          202: JobSchema,
          400: Type.Object({ message: Type.String() }),
          403: Type.Object({ message: Type.String() }),
        },
      },
    },
    async (req, reply) => {
      if (
        !req.apiKey?.scopes.includes("download:write") &&
        !req.apiKey?.scopes.includes("download:*")
      ) {
        return reply
          .code(403)
          .send({ message: "Missing scope download:write" });
      }
      const body = req.body as any;
      // Validate saveRoot policy
      if (body.saveRoot && !body.saveRoot.includes("projects")) {
        return reply
          .code(400)
          .send({ message: "saveRoot must contain projects/myprojects" });
      }
      const job = await createDownloadJob({
        urlOrId: body.urlOrId,
        accountName: body.accountName,
        saveRoot: body.saveRoot,
        apiKeyId: req.apiKey!.keyId,
        app,
      });
      reply.code(202).send(job);
    }
  );

  app.get(
    "/:id",
    {
      schema: {
        summary: "Get job status",
        tags: ["downloads"],
        params: Type.Object({ id: Type.String() }),
        headers: Type.Object({
          authorization: Type.Optional(
            Type.String({ description: "API key as Bearer token" })
          ),
          "x-api-key": Type.Optional(
            Type.String({ description: "API key as header" })
          ),
        }),
        response: {
          200: JobSchema,
          404: Type.Object({ message: Type.String() }),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const job = await getJobStatus(id);
      if (!job) return reply.code(404).send({ message: "Job not found" });
      reply.send(job);
    }
  );

  app.get(
    "/:id/logs",
    {
      schema: {
        summary: "Stream job logs (SSE)",
        tags: ["downloads"],
        params: Type.Object({ id: Type.String() }),
        headers: Type.Object({
          authorization: Type.Optional(
            Type.String({ description: "API key as Bearer token" })
          ),
          "x-api-key": Type.Optional(
            Type.String({ description: "API key as header" })
          ),
        }),
        response: {
          200: { description: "SSE stream of logs" },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      await streamJobLogs(id, reply.raw);
    }
  );

  app.post(
    "/:id/cancel",
    {
      schema: {
        summary: "Cancel a job",
        tags: ["downloads"],
        params: Type.Object({ id: Type.String() }),
        headers: Type.Object({
          authorization: Type.Optional(
            Type.String({ description: "API key as Bearer token" })
          ),
          "x-api-key": Type.Optional(
            Type.String({ description: "API key as header" })
          ),
        }),
        response: {
          204: { description: "Job canceled" },
          403: Type.Object({ message: Type.String() }),
        },
      },
    },
    async (req, reply) => {
      if (
        !req.apiKey?.scopes.includes("download:write") &&
        !req.apiKey?.scopes.includes("download:*")
      ) {
        return reply
          .code(403)
          .send({ message: "Missing scope download:write" });
      }
      const { id } = req.params as { id: string };
      await cancelJob(id);
      reply.code(204).send();
    }
  );

  app.get(
    "/:id/zip",
    {
      schema: {
        summary: "Download the job's zip file",
        tags: ["downloads"],
        params: Type.Object({ id: Type.String() }),
        headers: Type.Object({
          authorization: Type.Optional(
            Type.String({ description: "API key as Bearer token" })
          ),
          "x-api-key": Type.Optional(
            Type.String({ description: "API key as header" })
          ),
        }),
        response: {
          200: { description: "application/zip" },
          403: Type.Object({ message: Type.String() }),
          404: Type.Object({ message: Type.String() }),
        },
      },
    },
    async (req, reply) => {
      if (
        !req.apiKey?.scopes.includes("download:read") &&
        !req.apiKey?.scopes.includes("download:*")
      ) {
        return reply.code(403).send({ message: "Missing scope download:read" });
      }
      const { id } = req.params as { id: string };
      const dl = await app.prisma.download.findUnique({ where: { id } });
      if (!dl || dl.apiKeyId !== req.apiKey!.keyId)
        return reply.code(404).send({ message: "Not found" });
      if (!dl.zipPath || !fs.existsSync(dl.zipPath))
        return reply.code(404).send({ message: "Zip not available" });
      reply.header("Content-Type", "application/zip");
      reply.header(
        "Content-Disposition",
        `attachment; filename="${path.basename(dl.zipPath)}"`
      );
      const stream = fs.createReadStream(dl.zipPath);
      return reply.send(stream);
    }
  );
}
