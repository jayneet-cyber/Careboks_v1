import type { AiAnalysis, Approval, PatientCase, PatientProfile } from "@prisma/client";
import { prismaToApiCaseStatus } from "./cases.types.js";

type CaseWithRelations = PatientCase & {
  patientProfiles: PatientProfile[];
  aiAnalyses: AiAnalysis[];
  approvals: Approval[];
};

const toIso = (value: Date | null) => value?.toISOString() ?? null;

export const serializeCase = (record: PatientCase) => ({
  id: record.id,
  created_by: record.createdBy,
  technical_note: record.technicalNote,
  uploaded_file_names: record.uploadedFileNames,
  status: prismaToApiCaseStatus[record.status],
  completed_at: toIso(record.completedAt),
  created_at: record.createdAt.toISOString(),
  updated_at: record.updatedAt.toISOString()
});

export const serializePatientProfile = (record: PatientProfile) => ({
  id: record.id,
  case_id: record.caseId,
  age_bracket: record.ageBracket,
  sex: record.sex,
  language: record.language,
  health_literacy: record.healthLiteracy,
  journey_type: record.journeyType,
  risk_appetite: record.riskAppetite,
  has_accessibility_needs: record.hasAccessibilityNeeds,
  include_relatives: record.includeRelatives,
  comorbidities: record.comorbidities,
  created_at: record.createdAt.toISOString()
});

export const serializeAiAnalysis = (record: AiAnalysis) => ({
  id: record.id,
  case_id: record.caseId,
  analysis_data: record.analysisData,
  ai_draft_text: record.aiDraftText,
  model_used: record.modelUsed,
  created_at: record.createdAt.toISOString()
});

export const serializeApproval = (record: Approval) => ({
  id: record.id,
  case_id: record.caseId,
  approved_by: record.approvedBy,
  approved_text: record.approvedText,
  notes: record.notes,
  approved_at: record.approvedAt.toISOString()
});

export const serializeCaseWithRelations = (record: CaseWithRelations) => ({
  ...serializeCase(record),
  patient_profiles: record.patientProfiles.map(serializePatientProfile),
  ai_analyses: record.aiAnalyses.map(serializeAiAnalysis),
  approvals: record.approvals.map(serializeApproval)
});
