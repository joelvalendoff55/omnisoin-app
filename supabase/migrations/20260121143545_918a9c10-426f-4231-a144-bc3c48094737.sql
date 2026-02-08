-- Fix encrypted_fields_overview view to use security_invoker
DROP VIEW IF EXISTS public.encrypted_fields_overview;

CREATE VIEW public.encrypted_fields_overview
WITH (security_invoker = on)
AS
SELECT 
  efr.id,
  efr.table_name,
  efr.column_name,
  efr.encryption_key_purpose,
  efr.is_encrypted,
  efr.sensitivity_level,
  efr.requires_justification,
  efr.created_at,
  efr.updated_at
FROM public.encrypted_fields_registry efr
ORDER BY efr.sensitivity_level DESC, efr.table_name, efr.column_name;