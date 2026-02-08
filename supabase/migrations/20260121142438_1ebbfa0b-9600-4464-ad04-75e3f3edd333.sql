-- Fix security issues from Sprint 5

-- 1. Fix SECURITY DEFINER view - make it a regular view with RLS
DROP VIEW IF EXISTS public.encrypted_fields_overview;

-- Create as regular view (invoker rights by default)
CREATE VIEW public.encrypted_fields_overview AS
SELECT 
  efr.table_name,
  efr.column_name,
  efr.encryption_key_purpose,
  efr.is_encrypted,
  efr.sensitivity_level,
  efr.requires_justification
FROM public.encrypted_fields_registry efr
ORDER BY efr.sensitivity_level DESC, efr.table_name, efr.column_name;

-- 2. Fix overly permissive INSERT policy on structure_isolation_alerts
DROP POLICY IF EXISTS "isolation_alerts_insert_system" ON public.structure_isolation_alerts;

-- Create more restrictive insert policy (only authenticated users can insert for their structure)
CREATE POLICY "isolation_alerts_insert_authenticated"
  ON public.structure_isolation_alerts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND attempted_by = auth.uid()
  );