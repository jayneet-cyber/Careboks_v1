import type { ClinicianContact, Profile, User, UserDocument } from "@prisma/client";

export const serializeAccountProfile = (user: User, profile: Profile | null) => ({
  id: user.id,
  first_name: profile?.firstName ?? "",
  last_name: profile?.lastName ?? "",
  email: user.email,
  role: profile?.role ?? "",
  language: profile?.language ?? "est"
});

export const serializeContact = (record: ClinicianContact) => ({
  id: record.id,
  name: record.name,
  specialty: record.specialty,
  phone: record.phone,
  email: record.email,
  notes: record.notes,
  is_primary: record.isPrimary
});

export const serializeUserDocument = (record: UserDocument) => ({
  id: record.id,
  file_name: record.fileName,
  file_path: record.filePath,
  file_type: record.fileType,
  file_size: record.fileSize ?? 0,
  uploaded_at: record.uploadedAt.toISOString()
});
