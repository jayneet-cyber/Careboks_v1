-- Drop and recreate function to include case_id in return for patient feedback
DROP FUNCTION IF EXISTS public.get_published_document_by_token(text);

CREATE FUNCTION public.get_published_document_by_token(token text)
 RETURNS TABLE(id uuid, case_id uuid, sections_data jsonb, patient_language text, clinician_name text, hospital_name text, published_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Increment view count
  UPDATE published_documents
  SET view_count = view_count + 1
  WHERE access_token = token AND is_active = true AND (expires_at IS NULL OR expires_at > now());
  
  -- Return document data including case_id for patient feedback
  RETURN QUERY
  SELECT 
    pd.id,
    pd.case_id,
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
$function$;