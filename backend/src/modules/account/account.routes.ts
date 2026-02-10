import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createContactForUser,
  deleteContactForUser,
  deleteDocumentForUser,
  getDocumentDownloadForUser,
  getOrCreateAccountProfile,
  listContactsForUser,
  listDocumentsForUser,
  updateAccountProfile,
  updateContactForUser,
  uploadDocumentForUser
} from "./account.service.js";
import {
  serializeAccountProfile,
  serializeContact,
  serializeUserDocument
} from "./account.serializer.js";

const profileUpdateSchema = z.object({
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  role: z.string().default(""),
  language: z.string().default("est")
});

const contactSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_primary: z.boolean().default(false)
});

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const uploadDocumentSchema = z.object({
  file_name: z.string().min(1),
  file_type: z.string().min(1),
  file_data: z.string().min(1),
  file_size: z.number().int().nonnegative().optional()
});

const accountRoutes: FastifyPluginAsync = async (app) => {
  app.get("/profile", { preHandler: app.authenticate }, async (request, reply) => {
    const user = await getOrCreateAccountProfile(request.user.sub);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }
    return reply.send(serializeAccountProfile(user, user.profile));
  });

  app.patch("/profile", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = profileUpdateSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const user = await updateAccountProfile(request.user.sub, {
      firstName: bodyResult.data.first_name,
      lastName: bodyResult.data.last_name,
      role: bodyResult.data.role,
      language: bodyResult.data.language
    });

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    return reply.send(serializeAccountProfile(user, user.profile));
  });

  app.get("/contacts", { preHandler: app.authenticate }, async (request) => {
    const records = await listContactsForUser(request.user.sub);
    return records.map(serializeContact);
  });

  app.post("/contacts", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = contactSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const result = await createContactForUser(request.user.sub, {
      name: bodyResult.data.name,
      specialty: bodyResult.data.specialty,
      phone: bodyResult.data.phone,
      email: bodyResult.data.email,
      notes: bodyResult.data.notes,
      isPrimary: bodyResult.data.is_primary
    });

    if ("error" in result) {
      return reply.code(400).send({ message: result.error });
    }

    return reply.code(201).send(serializeContact(result.data));
  });

  app.patch("/contacts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = idParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const bodyResult = contactSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await updateContactForUser(request.user.sub, paramsResult.data.id, {
      name: bodyResult.data.name,
      specialty: bodyResult.data.specialty,
      phone: bodyResult.data.phone,
      email: bodyResult.data.email,
      notes: bodyResult.data.notes,
      isPrimary: bodyResult.data.is_primary
    });

    if (!record) {
      return reply.code(404).send({ message: "Contact not found" });
    }

    return reply.send(serializeContact(record));
  });

  app.delete("/contacts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = idParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const record = await deleteContactForUser(request.user.sub, paramsResult.data.id);
    if (!record) {
      return reply.code(404).send({ message: "Contact not found" });
    }

    return reply.send({ message: "Deleted" });
  });

  app.get("/documents", { preHandler: app.authenticate }, async (request) => {
    const records = await listDocumentsForUser(request.user.sub);
    return records.map(serializeUserDocument);
  });

  app.post("/documents", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = uploadDocumentSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const record = await uploadDocumentForUser(request.user.sub, {
      fileName: bodyResult.data.file_name,
      fileType: bodyResult.data.file_type,
      fileData: bodyResult.data.file_data,
      fileSize: bodyResult.data.file_size
    });

    return reply.code(201).send(serializeUserDocument(record));
  });

  app.get("/documents/:id/download", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = idParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const result = await getDocumentDownloadForUser(request.user.sub, paramsResult.data.id);
    if (!result) {
      return reply.code(404).send({ message: "Document not found" });
    }

    return reply.send({
      id: result.record.id,
      file_name: result.record.fileName,
      file_type: result.record.fileType,
      file_data_base64: result.fileDataBase64
    });
  });

  app.delete("/documents/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const paramsResult = idParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: paramsResult.error.message });
    }

    const record = await deleteDocumentForUser(request.user.sub, paramsResult.data.id);
    if (!record) {
      return reply.code(404).send({ message: "Document not found" });
    }

    return reply.send({ message: "Deleted" });
  });
};

export default accountRoutes;
