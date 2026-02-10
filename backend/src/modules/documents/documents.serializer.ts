import type { PublishedDocument } from "@prisma/client";

const toIso = (value: Date | null) => value?.toISOString() ?? null;

export const serializePublishedDocument = (record: PublishedDocument) => ({
  id: record.id,
  case_id: record.caseId,
  created_by: record.createdBy,
  access_token: record.accessToken,
  sections_data: record.sectionsData,
  patient_language: record.patientLanguage,
  clinician_name: record.clinicianName,
  hospital_name: record.hospitalName,
  published_at: record.publishedAt.toISOString(),
  expires_at: toIso(record.expiresAt),
  view_count: record.viewCount,
  is_active: record.isActive
});
