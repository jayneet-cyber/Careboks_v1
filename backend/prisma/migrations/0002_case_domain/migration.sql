CREATE TYPE "case_status" AS ENUM (
  'draft',
  'processing',
  'pending_approval',
  'approved',
  'completed'
);

CREATE TABLE "patient_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "created_by" UUID NOT NULL,
  "technical_note" TEXT,
  "uploaded_file_names" TEXT[] NOT NULL DEFAULT '{}',
  "status" "case_status" NOT NULL DEFAULT 'draft',
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "patient_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_patient_cases_created_by" ON "patient_cases"("created_by");

CREATE TABLE "patient_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "age_bracket" TEXT,
  "sex" TEXT,
  "language" TEXT,
  "health_literacy" TEXT,
  "journey_type" TEXT,
  "risk_appetite" TEXT,
  "has_accessibility_needs" BOOLEAN,
  "include_relatives" BOOLEAN,
  "comorbidities" TEXT[] NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_profiles_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "patient_profiles_case_id_key" ON "patient_profiles"("case_id");

CREATE TABLE "ai_analyses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "analysis_data" JSONB,
  "ai_draft_text" TEXT,
  "model_used" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_analyses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_ai_analyses_case_id" ON "ai_analyses"("case_id");

CREATE TABLE "approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "approved_by" UUID NOT NULL,
  "approved_text" TEXT NOT NULL,
  "notes" TEXT,
  "approved_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approvals_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_approvals_case_id" ON "approvals"("case_id");
CREATE INDEX "idx_approvals_approved_by" ON "approvals"("approved_by");

CREATE TABLE "case_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "submitted_by" UUID NOT NULL,
  "selected_options" TEXT[] NOT NULL DEFAULT '{}',
  "additional_comments" TEXT,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "case_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "case_feedback_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "case_feedback_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_case_feedback_case_id" ON "case_feedback"("case_id");
CREATE INDEX "idx_case_feedback_submitted_by" ON "case_feedback"("submitted_by");
