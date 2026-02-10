CREATE TABLE "published_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "access_token" TEXT NOT NULL,
  "sections_data" JSONB NOT NULL,
  "patient_language" TEXT NOT NULL DEFAULT 'est',
  "clinician_name" TEXT NOT NULL,
  "hospital_name" TEXT,
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "published_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "published_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "published_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "published_documents_access_token_key" ON "published_documents"("access_token");
CREATE INDEX "idx_published_documents_access_token" ON "published_documents"("access_token");
CREATE INDEX "idx_published_documents_case_id" ON "published_documents"("case_id");

CREATE TABLE "patient_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "published_document_id" UUID NOT NULL,
  "feedback_source" TEXT NOT NULL DEFAULT 'qr_view',
  "selected_options" TEXT[] NOT NULL DEFAULT '{}',
  "additional_comments" TEXT,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "patient_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_feedback_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "patient_feedback_published_document_id_fkey" FOREIGN KEY ("published_document_id") REFERENCES "published_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_patient_feedback_case_id" ON "patient_feedback"("case_id");
CREATE INDEX "idx_patient_feedback_published_document_id" ON "patient_feedback"("published_document_id");
