import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createCaseForUser,
  getCaseHistoryForUser,
  loadCaseForUser,
  saveAiAnalysisForUser,
  saveApprovalForUser,
  saveCaseFeedbackForUser,
  savePatientProfileForUser,
  updateCaseForUser
} from "./cases.service.js";
import {
  serializeAiAnalysis,
  serializeApproval,
  serializeCase,
  serializeCaseWithRelations,
  serializePatientProfile
} from "./cases.serializer.js";

const caseStatusSchema = z.enum([
  "draft",
  "processing",
  "pending_approval",
  "approved",
  "completed"
]);

const createCaseSchema = z.object({
  technicalNote: z.string().min(1),
  uploadedFileNames: z.array(z.string()).default([])
});

const updateCaseSchema = z.object({
  technicalNote: z.string().optional(),
  uploadedFileNames: z.array(z.string()).optional(),
  status: caseStatusSchema.optional()
}).refine(
  (value) => value.technicalNote !== undefined || value.uploadedFileNames !== undefined || value.status !== undefined,
  { message: "At least one field is required for update" }
);

const caseParamsSchema = z.object({
  caseId: z.string().uuid()
});

const savePatientProfileSchema = z.object({
  age: z.string(),
  sex: z.string(),
  language: z.string(),
  healthLiteracy: z.string(),
  journeyType: z.string(),
  riskAppetite: z.string(),
  hasAccessibilityNeeds: z.boolean(),
  includeRelatives: z.boolean(),
  comorbidities: z.array(z.string())
});

const saveAnalysisSchema = z.object({
  analysisData: z.unknown(),
  aiDraftText: z.string(),
  modelUsed: z.string().optional()
});

const saveApprovalSchema = z.object({
  approvedText: z.string().min(1),
  notes: z.string().optional()
});

const saveCaseFeedbackSchema = z.object({
  selectedOptions: z.array(z.string()).default([]),
  additionalComments: z.string().nullable().optional()
});

const queryCaseHistorySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10)
});

const casesRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = createCaseSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await createCaseForUser(request.user.sub, bodyResult.data);
    return reply.code(201).send(serializeCase(record));
  });

  app.patch("/:caseId", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const bodyResult = updateCaseSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await updateCaseForUser(request.user.sub, paramsResult.data.caseId, bodyResult.data);
    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.send(serializeCase(record));
  });

  app.post("/:caseId/profile", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const bodyResult = savePatientProfileSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await savePatientProfileForUser(request.user.sub, paramsResult.data.caseId, bodyResult.data);
    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.send(serializePatientProfile(record));
  });

  app.post("/:caseId/analysis", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const bodyResult = saveAnalysisSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await saveAiAnalysisForUser(request.user.sub, paramsResult.data.caseId, bodyResult.data);
    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.send(serializeAiAnalysis(record));
  });

  app.post("/:caseId/approval", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const bodyResult = saveApprovalSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await saveApprovalForUser(request.user.sub, paramsResult.data.caseId, bodyResult.data);
    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.send(serializeApproval(record));
  });

  app.post("/:caseId/feedback", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const bodyResult = saveCaseFeedbackSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await saveCaseFeedbackForUser(request.user.sub, paramsResult.data.caseId, {
      selectedOptions: bodyResult.data.selectedOptions,
      additionalComments: bodyResult.data.additionalComments
    });

    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.code(201).send({
      id: record.id,
      case_id: record.caseId,
      submitted_by: record.submittedBy,
      selected_options: record.selectedOptions,
      additional_comments: record.additionalComments,
      submitted_at: record.submittedAt.toISOString()
    });
  });

  app.get("/:caseId", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = caseParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const record = await loadCaseForUser(request.user.sub, paramsResult.data.caseId);
    if (!record) {
      return reply.code(404).send({ message: "Case not found" });
    }

    return reply.send(serializeCaseWithRelations(record));
  });

  app.get("/", { preHandler: app.authenticate }, async (request, reply) => {
    const queryResult = queryCaseHistorySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.code(400).send({ message: queryResult.error.message });
    }

    const records = await getCaseHistoryForUser(request.user.sub, queryResult.data.limit);
    return reply.send(records.map(serializeCase));
  });
};

export default casesRoutes;
