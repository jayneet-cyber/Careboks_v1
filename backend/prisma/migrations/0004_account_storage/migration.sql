ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "role" TEXT;

CREATE TABLE "clinician_contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "specialty" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "clinician_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinician_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_clinician_contacts_user_id" ON "clinician_contacts"("user_id");
CREATE INDEX "idx_clinician_contacts_is_primary" ON "clinician_contacts"("is_primary");

CREATE TABLE "user_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_size" INTEGER,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_user_documents_user_id" ON "user_documents"("user_id");
