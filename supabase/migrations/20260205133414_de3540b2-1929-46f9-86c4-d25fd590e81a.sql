-- Create patient feedback table for QR code view feedback
CREATE TABLE public.patient_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES patient_cases(id) ON DELETE CASCADE,
  published_document_id uuid NOT NULL REFERENCES published_documents(id) ON DELETE CASCADE,
  feedback_source text NOT NULL DEFAULT 'qr_view',
  selected_options text[] NOT NULL DEFAULT '{}',
  additional_comments text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (patients aren't authenticated)
CREATE POLICY "Anyone can submit patient feedback"
ON public.patient_feedback FOR INSERT
WITH CHECK (true);

-- Clinicians can view feedback for cases they created
CREATE POLICY "Clinicians view patient feedback for their cases"
ON public.patient_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patient_cases
    WHERE patient_cases.id = patient_feedback.case_id
    AND patient_cases.created_by = auth.uid()
  )
);