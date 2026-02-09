-- Create feedback table for storing clinician feedback on generated documents
CREATE TABLE public.case_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES patient_cases(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  selected_options TEXT[] NOT NULL DEFAULT '{}',
  additional_comments TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.case_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create feedback for their cases"
  ON public.case_feedback FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by AND
    EXISTS (SELECT 1 FROM patient_cases WHERE id = case_feedback.case_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can view their own feedback"
  ON public.case_feedback FOR SELECT
  USING (auth.uid() = submitted_by);