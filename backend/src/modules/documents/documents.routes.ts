import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  deactivateDocumentForUser,
  getLatestActiveDocumentForCase,
  publishDocumentForUser
} from "./documents.service.js";
import { serializePublishedDocument } from "./documents.serializer.js";

const publishDocumentSchema = z.object({
  caseId: z.string().uuid(),
  sectionsData: z.unknown(),
  patientLanguage: z.string().min(1),
  clinicianName: z.string().min(1),
  hospitalName: z.string().optional(),
  expiresAt: z.string().datetime().optional()
});

const caseParamsSchema = z.object({
  caseId: z.string().uuid()
});

const documentParamsSchema = z.object({
  documentId: z.string().uuid()
});

const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = publishDocumentSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await publishDocumentForUser(request.user.sub, {
      caseId: bodyResult.data.caseId,
      sectionsData: bodyResult.data.sectionsData,
      patientLanguage: bodyResult.data.patientLanguage,
      clinicianName: bodyResult.data.clinicianName,
      hospitalName: bodyResult.data.hospitalName,
      expiresAt: bodyResult.data.expiresAt ? new Date(bodyResult.data.expiresAt) : undefined
    });

    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.code(201).send(serializePublishedDocument(record));
  });

  app.get("/case/:caseId", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const record = await getLatestActiveDocumentForCase(request.user.sub, paramsResult.data.caseId);
    if (!record) {
      return reply.code(404).send({ message: "No active document found" });
    }

    return reply.send(serializePublishedDocument(record));
  });

  app.patch("/:documentId/deactivate", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = documentParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const record = await deactivateDocumentForUser(request.user.sub, paramsResult.data.documentId);
    if (!record) {
      return reply.code(404).send({ message: "Document not found" });
    }

    return reply.send(serializePublishedDocument(record));
  });
};

export default documentsRoutes;
