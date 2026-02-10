import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { serializePublishedDocument } from "../documents/documents.serializer.js";
import { getPublicDocumentByToken, submitPatientFeedback } from "../documents/documents.service.js";

const tokenParamsSchema = z.object({
  token: z.string().min(1)
});

const submitPatientFeedbackSchema = z.object({
  caseId: z.string().uuid(),
  publishedDocumentId: z.string().uuid(),
  feedbackSource: z.string().optional(),
  selectedOptions: z.array(z.string()).default([]),
  additionalComments: z.string().nullable().optional()
});

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/documents/:token", async (request, reply) => {
    const paramsResult = tokenParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const record = await getPublicDocumentByToken(paramsResult.data.token);
    if (!record) {
      return reply.code(404).send({ message: "Document not found" });
    }

    return reply.send(serializePublishedDocument(record));
  });

  app.post("/patient-feedback", async (request, reply) => {
    const bodyResult = submitPatientFeedbackSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const result = await submitPatientFeedback({
      caseId: bodyResult.data.caseId,
      publishedDocumentId: bodyResult.data.publishedDocumentId,
      feedbackSource: bodyResult.data.feedbackSource,
      selectedOptions: bodyResult.data.selectedOptions,
      additionalComments: bodyResult.data.additionalComments
    });

    if ("error" in result) {
      return reply.code(400).send({ message: result.error });
    }

    return reply.code(201).send({
      id: result.data.id,
      case_id: result.data.caseId,
      published_document_id: result.data.publishedDocumentId,
      feedback_source: result.data.feedbackSource,
      selected_options: result.data.selectedOptions,
      additional_comments: result.data.additionalComments,
      submitted_at: result.data.submittedAt.toISOString()
    });
  });
};

export default publicRoutes;
