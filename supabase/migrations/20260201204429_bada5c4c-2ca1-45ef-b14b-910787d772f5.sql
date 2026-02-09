-- Create published_documents table for storing shareable patient documents
CREATE TABLE public.published_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES patient_cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  access_token TEXT NOT NULL UNIQUE,
  sections_data JSONB NOT NULL,
  patient_language TEXT NOT NULL DEFAULT 'est',
  clinician_name TEXT NOT NULL,
  hospital_name TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create index on access_token for fast public lookups
CREATE INDEX idx_published_documents_access_token ON public.published_documents(access_token);

-- Create index on case_id for clinician lookups
CREATE INDEX idx_published_documents_case_id ON public.published_documents(case_id);

-- Enable Row Level Security
ALTER TABLE public.published_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Clinicians can view their own published documents
CREATE POLICY "Users can view their own published documents"
ON public.published_documents
FOR SELECT
USING (auth.uid() = created_by);

-- Policy: Clinicians can create published documents for their cases
CREATE POLICY "Users can create published documents for their cases"
ON public.published_documents
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM patient_cases
    WHERE patient_cases.id = published_documents.case_id
    AND patient_cases.created_by = auth.uid()
  )
);

-- Policy: Clinicians can update their own published documents
CREATE POLICY "Users can update their own published documents"
ON public.published_documents
FOR UPDATE
USING (auth.uid() = created_by);

-- Policy: Public can view active documents via access_token (for patient view)
-- This uses a security definer function to allow public access
CREATE OR REPLACE FUNCTION public.get_published_document_by_token(token TEXT)
RETURNS TABLE (
  id UUID,
  sections_data JSONB,
  patient_language TEXT,
  clinician_name TEXT,
  hospital_name TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment view count
  UPDATE published_documents
  SET view_count = view_count + 1
  WHERE access_token = token AND is_active = true AND (expires_at IS NULL OR expires_at > now());
  
  -- Return document data
  RETURN QUERY
  SELECT 
    pd.id,
    pd.sections_data,
    pd.patient_language,
    pd.clinician_name,
    pd.hospital_name,
    pd.published_at
  FROM published_documents pd
  WHERE pd.access_token = token 
    AND pd.is_active = true 
    AND (pd.expires_at IS NULL OR pd.expires_at > now());
END;
$$;