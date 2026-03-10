ALTER TABLE public.patient_profiles
ADD COLUMN IF NOT EXISTS selected_section_ids TEXT[];

UPDATE public.patient_profiles
SET selected_section_ids = ARRAY['what_i_have', 'how_to_live', 'timeline', 'life_impact', 'medications', 'warnings', 'contacts']
WHERE selected_section_ids IS NULL;

ALTER TABLE public.published_documents
ADD COLUMN IF NOT EXISTS selected_section_ids TEXT[];

UPDATE public.published_documents
SET selected_section_ids = ARRAY['what_i_have', 'how_to_live', 'timeline', 'life_impact', 'medications', 'warnings', 'contacts']
WHERE selected_section_ids IS NULL;

DROP FUNCTION IF EXISTS public.get_published_document_by_token(text);

CREATE FUNCTION public.get_published_document_by_token(token text)
RETURNS TABLE(
  id uuid,
  case_id uuid,
  sections_data jsonb,
  selected_section_ids text[],
  patient_language text,
  clinician_name text,
  hospital_name text,
  published_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE published_documents
  SET view_count = view_count + 1
  WHERE access_token = token AND is_active = true AND (expires_at IS NULL OR expires_at > now());

  RETURN QUERY
  SELECT
    pd.id,
    pd.case_id,
    pd.sections_data,
    pd.selected_section_ids,
    pd.patient_language,
    pd.clinician_name,
    pd.hospital_name,
    pd.published_at
  FROM published_documents pd
  WHERE pd.access_token = token
    AND pd.is_active = true
    AND (pd.expires_at IS NULL OR pd.expires_at > now());
END;
$function$;
