import { CaseStatus as PrismaCaseStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { apiToPrismaCaseStatus, type ApiCaseStatus } from "./cases.types.js";

type CreateCaseInput = {
  technicalNote: string;
  uploadedFileNames: string[];
};

type UpdateCaseInput = {
  technicalNote?: string;
  uploadedFileNames?: string[];
  status?: ApiCaseStatus;
};

type SavePatientProfileInput = {
  age: string;
  sex: string;
  language: string;
  healthLiteracy: string;
  journeyType: string;
  riskAppetite: string;
  hasAccessibilityNeeds: boolean;
  includeRelatives: boolean;
  comorbidities: string[];
};

type SaveAnalysisInput = {
  analysisData?: unknown;
  aiDraftText: string;
  modelUsed?: string;
};

type SaveApprovalInput = {
  approvedText: string;
  notes?: string;
};

type SaveCaseFeedbackInput = {
  selectedOptions: string[];
  additionalComments?: string | null;
};

const assertCaseOwnership = async (caseId: string, userId: string) => {
  const ownedCase = await prisma.patientCase.findFirst({
    where: {
      id: caseId,
      createdBy: userId
    }
  });

  if (!ownedCase) {
    return null;
  }

  return ownedCase;
};

export const createCaseForUser = async (userId: string, input: CreateCaseInput) => {
  return prisma.patientCase.create({
    data: {
      createdBy: userId,
      technicalNote: input.technicalNote,
      uploadedFileNames: input.uploadedFileNames,
      status: apiToPrismaCaseStatus.draft
    }
  });
};

export const updateCaseForUser = async (userId: string, caseId: string, input: UpdateCaseInput) => {
  const ownedCase = await assertCaseOwnership(caseId, userId);
  if (!ownedCase) {
    return null;
  }

  const updateData: {
    technicalNote?: string;
    uploadedFileNames?: string[];
    status?: PrismaCaseStatus;
    completedAt?: Date | null;
  } = {};

  if (input.technicalNote !== undefined) {
    updateData.technicalNote = input.technicalNote;
  }

  if (input.uploadedFileNames !== undefined) {
    updateData.uploadedFileNames = input.uploadedFileNames;
  }

  if (input.status) {
    const nextStatus = apiToPrismaCaseStatus[input.status];
    updateData.status = nextStatus;

    if (nextStatus === PrismaCaseStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }
    if (nextStatus !== PrismaCaseStatus.COMPLETED) {
      updateData.completedAt = null;
    }
  }

  return prisma.patientCase.update({
    where: { id: caseId },
    data: updateData
  });
};

export const savePatientProfileForUser = async (
  userId: string,
  caseId: string,
  input: SavePatientProfileInput
) => {
  const ownedCase = await assertCaseOwnership(caseId, userId);
  if (!ownedCase) {
    return null;
  }

  return prisma.patientProfile.upsert({
    where: { caseId },
    create: {
      caseId,
      ageBracket: input.age,
      sex: input.sex,
      language: input.language,
      healthLiteracy: input.healthLiteracy,
      journeyType: input.journeyType,
      riskAppetite: input.riskAppetite,
      hasAccessibilityNeeds: input.hasAccessibilityNeeds,
      includeRelatives: input.includeRelatives,
      comorbidities: input.comorbidities
    },
    update: {
      ageBracket: input.age,
      sex: input.sex,
      language: input.language,
      healthLiteracy: input.healthLiteracy,
      journeyType: input.journeyType,
      riskAppetite: input.riskAppetite,
      hasAccessibilityNeeds: input.hasAccessibilityNeeds,
      includeRelatives: input.includeRelatives,
      comorbidities: input.comorbidities
    }
  });
};

export const saveAiAnalysisForUser = async (
  userId: string,
  caseId: string,
  input: SaveAnalysisInput
) => {
  const ownedCase = await assertCaseOwnership(caseId, userId);
  if (!ownedCase) {
    return null;
  }

  return prisma.aiAnalysis.create({
    data: {
      caseId,
      analysisData: (input.analysisData ?? null) as Prisma.InputJsonValue,
      aiDraftText: input.aiDraftText,
      modelUsed: input.modelUsed
    }
  });
};

export const saveApprovalForUser = async (
  userId: string,
  caseId: string,
  input: SaveApprovalInput
) => {
  const ownedCase = await assertCaseOwnership(caseId, userId);
  if (!ownedCase) {
    return null;
  }

  return prisma.approval.create({
    data: {
      caseId,
      approvedBy: userId,
      approvedText: input.approvedText,
      notes: input.notes
    }
  });
};

export const loadCaseForUser = async (userId: string, caseId: string) => {
  return prisma.patientCase.findFirst({
    where: {
      id: caseId,
      createdBy: userId
    },
    include: {
      patientProfiles: {
        orderBy: { createdAt: "desc" }
      },
      aiAnalyses: {
        orderBy: { createdAt: "desc" }
      },
      approvals: {
        orderBy: { approvedAt: "desc" }
      }
    }
  });
};

export const getCaseHistoryForUser = async (userId: string, limit: number) => {
  return prisma.patientCase.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
};

export const saveCaseFeedbackForUser = async (
  userId: string,
  caseId: string,
  input: SaveCaseFeedbackInput
) => {
  const ownedCase = await assertCaseOwnership(caseId, userId);
  if (!ownedCase) {
    return null;
  }

  return prisma.caseFeedback.create({
    data: {
      caseId,
      submittedBy: userId,
      selectedOptions: input.selectedOptions,
      additionalComments: input.additionalComments ?? null
    }
  });
};
