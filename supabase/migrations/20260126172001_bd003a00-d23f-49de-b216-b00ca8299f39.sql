-- =====================================================
-- SECURITY FIX PART 2: Secure additional views
-- =====================================================

-- 1. PATIENTS_SAFE VIEW - needs security_invoker
DROP VIEW IF EXISTS public.patients_safe;
CREATE VIEW public.patients_safe
WITH (security_invoker = on)
AS SELECT
  id,
  structure_id,
  first_name,
  last_name,
  CASE 
    WHEN email IS NOT NULL THEN SUBSTRING(email, 1, 2) || '***@***'
    ELSE NULL
  END AS email_masked,
  CASE 
    WHEN phone IS NOT NULL THEN '****' || RIGHT(phone, 4)
    ELSE NULL
  END AS phone_masked,
  dob,
  sex,
  origin,
  is_archived,
  created_at,
  updated_at,
  user_id,
  primary_practitioner_user_id
FROM public.patients
WHERE EXISTS (
  SELECT 1 FROM public.org_members
  WHERE org_members.user_id = auth.uid()
  AND org_members.structure_id = patients.structure_id
  AND org_members.is_active = true
);

-- 2. PATIENT_QUEUE_STATUS_TIMELINE VIEW (corrected column names)
DROP VIEW IF EXISTS public.patient_queue_status_timeline;
CREATE VIEW public.patient_queue_status_timeline
WITH (security_invoker = on)
AS SELECT
  psh.id,
  psh.changed_at,
  psh.changed_by,
  psh.previous_status,
  psh.new_status,
  psh.change_reason,
  psh.metadata,
  psh.structure_id,
  pq.patient_id,
  p.first_name AS patient_first_name,
  p.last_name AS patient_last_name,
  prof.first_name AS changed_by_first_name,
  prof.last_name AS changed_by_last_name
FROM public.patient_queue_status_history psh
LEFT JOIN public.patient_queue pq ON psh.queue_id = pq.id
LEFT JOIN public.patients p ON pq.patient_id = p.id
LEFT JOIN public.profiles prof ON psh.changed_by = prof.user_id
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = psh.structure_id
  AND om.is_active = true
);

-- 3. ENCRYPTED_FIELDS_OVERVIEW VIEW - admin only
DROP VIEW IF EXISTS public.encrypted_fields_overview;
CREATE VIEW public.encrypted_fields_overview
WITH (security_invoker = on)
AS SELECT
  efr.id,
  efr.table_name,
  efr.column_name,
  efr.is_encrypted,
  efr.sensitivity_level,
  efr.requires_justification,
  efr.encryption_key_purpose
FROM public.encrypted_fields_registry efr
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.is_active = true
  AND om.org_role IN ('owner', 'admin')
);

-- 4. STATS_DASHBOARD VIEW
DROP VIEW IF EXISTS public.stats_dashboard;
CREATE VIEW public.stats_dashboard
WITH (security_invoker = on)
AS SELECT
  s.id AS structure_id,
  s.name AS structure_name,
  (SELECT COUNT(*) FROM public.patients WHERE structure_id = s.id AND NOT is_archived) AS active_patients,
  (SELECT COUNT(*) FROM public.appointments WHERE structure_id = s.id) AS total_appointments,
  (SELECT COUNT(*) FROM public.patient_queue WHERE structure_id = s.id) AS queue_entries,
  (SELECT COUNT(*) FROM public.consultations WHERE structure_id = s.id) AS total_consultations,
  (SELECT COUNT(*) FROM public.documents WHERE structure_id = s.id) AS total_documents,
  (SELECT COUNT(*) FROM public.patient_transcripts WHERE structure_id = s.id) AS total_transcripts
FROM public.structures s
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = s.id
  AND om.is_active = true
);

-- Grant permissions
GRANT SELECT ON public.patients_safe TO authenticated;
GRANT SELECT ON public.patient_queue_status_timeline TO authenticated;
GRANT SELECT ON public.encrypted_fields_overview TO authenticated;
GRANT SELECT ON public.stats_dashboard TO authenticated;

-- Revoke public access
REVOKE ALL ON public.patients_safe FROM anon;
REVOKE ALL ON public.patient_queue_status_timeline FROM anon;
REVOKE ALL ON public.encrypted_fields_overview FROM anon;
REVOKE ALL ON public.stats_dashboard FROM anon;