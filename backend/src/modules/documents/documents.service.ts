import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";

type PublishDocumentInput = {
  caseId: string;
  sectionsData: unknown;
  patientLanguage: string;
  clinicianName: string;
  hospitalName?: string;
  expiresAt?: Date;
};

const generateAccessToken = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (value) => chars[value % chars.length]).join("");
};

const createUniqueAccessToken = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateAccessToken();
    const existingRecord = await prisma.publishedDocument.findUnique({
      where: { accessToken: token },
      select: { id: true }
    });

    if (!existingRecord) {
      return token;
    }
  }

  throw new Error("Unable to generate unique access token");
};

export const publishDocumentForUser = async (userId: string, input: PublishDocumentInput) => {
  const ownedCase = await prisma.patientCase.findFirst({
    where: {
      id: input.caseId,
      createdBy: userId
    },
    select: { id: true }
  });

  if (!ownedCase) {
    return null;
  }

  const accessToken = await createUniqueAccessToken();

  return prisma.publishedDocument.create({
    data: {
      caseId: input.caseId,
      createdBy: userId,
      accessToken,
      sectionsData: input.sectionsData as Prisma.InputJsonValue,
      patientLanguage: input.patientLanguage,
      clinicianName: input.clinicianName,
      hospitalName: input.hospitalName,
      expiresAt: input.expiresAt
    }
  });
};

export const getLatestActiveDocumentForCase = async (userId: string, caseId: string) => {
  return prisma.publishedDocument.findFirst({
    where: {
      caseId,
      createdBy: userId,
      isActive: true
    },
    orderBy: {
      publishedAt: "desc"
    }
  });
};

export const deactivateDocumentForUser = async (userId: string, documentId: string) => {
  const existingRecord = await prisma.publishedDocument.findFirst({
    where: {
      id: documentId,
      createdBy: userId
    },
    select: { id: true }
  });

  if (!existingRecord) {
    return null;
  }

  return prisma.publishedDocument.update({
    where: { id: documentId },
    data: { isActive: false }
  });
};

export const getPublicDocumentByToken = async (accessToken: string) => {
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const activeRecord = await transaction.publishedDocument.findFirst({
      where: {
        accessToken,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    });

    if (!activeRecord) {
      return null;
    }

    await transaction.publishedDocument.update({
      where: { id: activeRecord.id },
      data: {
        viewCount: { increment: 1 }
      }
    });

    return transaction.publishedDocument.findUnique({
      where: { id: activeRecord.id }
    });
  });
};

type SubmitPatientFeedbackInput = {
  caseId: string;
  publishedDocumentId: string;
  feedbackSource?: string;
  selectedOptions: string[];
  additionalComments?: string | null;
};

export const submitPatientFeedback = async (input: SubmitPatientFeedbackInput) => {
  const documentRecord = await prisma.publishedDocument.findUnique({
    where: { id: input.publishedDocumentId },
    select: {
      id: true,
      caseId: true,
      isActive: true,
      expiresAt: true
    }
  });

  if (!documentRecord) {
    return { error: "Published document not found" as const };
  }

  if (documentRecord.caseId !== input.caseId) {
    return { error: "Document and case mismatch" as const };
  }

  if (!documentRecord.isActive) {
    return { error: "Document is inactive" as const };
  }

  if (documentRecord.expiresAt && documentRecord.expiresAt <= new Date()) {
    return { error: "Document is expired" as const };
  }

  return {
    data: await prisma.patientFeedback.create({
      data: {
        caseId: input.caseId,
        publishedDocumentId: input.publishedDocumentId,
        feedbackSource: input.feedbackSource ?? "qr_view",
        selectedOptions: input.selectedOptions,
        additionalComments: input.additionalComments ?? null
      }
    })
  };
};
