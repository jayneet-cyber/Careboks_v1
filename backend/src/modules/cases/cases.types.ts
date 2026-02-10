import { CaseStatus as PrismaCaseStatus } from "@prisma/client";

export type ApiCaseStatus = "draft" | "processing" | "pending_approval" | "approved" | "completed";

export const apiToPrismaCaseStatus: Record<ApiCaseStatus, PrismaCaseStatus> = {
  draft: PrismaCaseStatus.DRAFT,
  processing: PrismaCaseStatus.PROCESSING,
  pending_approval: PrismaCaseStatus.PENDING_APPROVAL,
  approved: PrismaCaseStatus.APPROVED,
  completed: PrismaCaseStatus.COMPLETED
};

export const prismaToApiCaseStatus: Record<PrismaCaseStatus, ApiCaseStatus> = {
  [PrismaCaseStatus.DRAFT]: "draft",
  [PrismaCaseStatus.PROCESSING]: "processing",
  [PrismaCaseStatus.PENDING_APPROVAL]: "pending_approval",
  [PrismaCaseStatus.APPROVED]: "approved",
  [PrismaCaseStatus.COMPLETED]: "completed"
};
