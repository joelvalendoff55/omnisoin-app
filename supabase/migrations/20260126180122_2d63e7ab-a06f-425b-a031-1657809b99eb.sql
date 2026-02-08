-- =====================================================
-- SECURITY HARDENING MIGRATION - FINAL VERSION
-- Fix all critical security vulnerabilities
-- Using correct column names from actual schema
-- =====================================================

-- 1. Recreate org_members_with_details with correct columns
DROP VIEW IF EXISTS public.org_members_with_details;
CREATE VIEW public.org_members_with_details
WITH (security_invoker = on)
AS SELECT
  om.id,
  om.structure_id,
  om.user_id,
  om.org_role,
  om.is_active,
  om.accepted_at,
  om.invited_at,
  om.invited_by,
  om.created_at,
  COALESCE(p.first_name || ' ' || p.last_name, 'Membre') as display_name,
  p.phone,
  p.specialty
FROM public.org_members om
LEFT JOIN public.profiles p ON p.user_id = om.user_id
WHERE EXISTS (
  SELECT 1 FROM public.org_members my_om
  WHERE my_om.user_id = auth.uid()
  AND my_om.structure_id = om.structure_id
  AND my_om.is_active = true
);

GRANT SELECT ON public.org_members_with_details TO authenticated;
REVOKE ALL ON public.org_members_with_details FROM anon;

-- 2. Drop and recreate patient_queue_status_timeline with strict access
DROP VIEW IF EXISTS public.patient_queue_status_timeline;
CREATE VIEW public.patient_queue_status_timeline
WITH (security_invoker = on)
AS SELECT
  psh.id,
  psh.queue_id,
  psh.previous_status,
  psh.new_status,
  psh.changed_by,
  psh.change_reason,
  psh.changed_at,
  COALESCE(p.first_name || ' ' || p.last_name, 'Système') as changed_by_name,
  pq.structure_id
FROM public.patient_queue_status_history psh
JOIN public.patient_queue pq ON pq.id = psh.queue_id
LEFT JOIN public.profiles p ON p.user_id = psh.changed_by
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = pq.structure_id
  AND om.is_active = true
);

GRANT SELECT ON public.patient_queue_status_timeline TO authenticated;
REVOKE ALL ON public.patient_queue_status_timeline FROM anon;

-- 3. Drop and recreate patients_safe with strict access
DROP VIEW IF EXISTS public.patients_safe;
CREATE VIEW public.patients_safe
WITH (security_invoker = on)
AS SELECT
  p.id,
  p.structure_id,
  CASE WHEN LENGTH(p.first_name) > 2 THEN SUBSTRING(p.first_name, 1, 2) || '***' ELSE '***' END AS first_name_masked,
  CASE WHEN LENGTH(p.last_name) > 2 THEN SUBSTRING(p.last_name, 1, 2) || '***' ELSE '***' END AS last_name_masked,
  p.sex as gender,
  CASE WHEN p.dob IS NOT NULL THEN 
    EXTRACT(YEAR FROM p.dob)::text || '-**-**'
  ELSE NULL END AS birth_year_only,
  p.status,
  p.is_archived,
  p.created_at,
  p.updated_at
FROM public.patients p
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = p.structure_id
  AND om.is_active = true
);

GRANT SELECT ON public.patients_safe TO authenticated;
REVOKE ALL ON public.patients_safe FROM anon;

-- 4. Drop and recreate stats_dashboard with strict access
DROP VIEW IF EXISTS public.stats_dashboard;
CREATE VIEW public.stats_dashboard
WITH (security_invoker = on)
AS SELECT
  s.id as structure_id,
  s.name as structure_name,
  (SELECT COUNT(*) FROM public.patients pt WHERE pt.structure_id = s.id AND pt.is_archived = false) as active_patients,
  (SELECT COUNT(*) FROM public.consultations c WHERE c.structure_id = s.id) as total_consultations,
  (SELECT COUNT(*) FROM public.org_members omx WHERE omx.structure_id = s.id AND omx.is_active = true) as active_members
FROM public.structures s
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = s.id
  AND om.is_active = true
);

GRANT SELECT ON public.stats_dashboard TO authenticated;
REVOKE ALL ON public.stats_dashboard FROM anon;

-- 5. Drop and recreate system_compliance_dashboard with strict access
DROP VIEW IF EXISTS public.system_compliance_dashboard;
CREATE VIEW public.system_compliance_dashboard
WITH (security_invoker = on)
AS SELECT
  s.id as structure_id,
  s.name as structure_name,
  (SELECT COUNT(*) FROM public.immutable_audit_log ial WHERE ial.structure_id = s.id) as total_audit_logs,
  (SELECT COUNT(*) FROM public.data_access_log dal WHERE dal.structure_id = s.id) as total_data_access_logs,
  (SELECT COUNT(*) FROM public.structure_isolation_alerts sia WHERE sia.source_structure_id = s.id OR sia.target_structure_id = s.id) as isolation_alerts,
  (SELECT COUNT(*) FROM public.gdpr_audit_logs gal WHERE gal.structure_id = s.id) as gdpr_audit_count
FROM public.structures s
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = s.id
  AND om.is_active = true
  AND om.org_role IN ('owner', 'admin')
);

GRANT SELECT ON public.system_compliance_dashboard TO authenticated;
REVOKE ALL ON public.system_compliance_dashboard FROM anon;

-- 6. Ensure no anonymous access to any sensitive tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.identities_vault FROM anon;
REVOKE ALL ON public.patients FROM anon;
REVOKE ALL ON public.org_members FROM anon;
REVOKE ALL ON public.consultations FROM anon;
REVOKE ALL ON public.data_access_log FROM anon;
REVOKE ALL ON public.gdpr_audit_logs FROM anon;
REVOKE ALL ON public.immutable_audit_log FROM anon;
REVOKE ALL ON public.structure_isolation_alerts FROM anon;
REVOKE ALL ON public.encrypted_fields_registry FROM anon;
REVOKE ALL ON public.export_requests FROM anon;

-- 7. Strengthen profiles RLS - only same structure members can view
DROP POLICY IF EXISTS "profiles_select_same_structure_only" ON public.profiles;

CREATE POLICY "profiles_select_same_structure_strict"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Own profile is always visible
  user_id = auth.uid()
  OR
  -- Profiles in the same structure(s) as the current user
  EXISTS (
    SELECT 1 FROM public.org_members my_membership
    WHERE my_membership.user_id = auth.uid()
    AND my_membership.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.org_members their_membership
      WHERE their_membership.user_id = profiles.user_id
      AND their_membership.structure_id = my_membership.structure_id
      AND their_membership.is_active = true
    )
  )
);

-- 8. Strengthen identities_vault RLS
DROP POLICY IF EXISTS "identities_vault_select_strict" ON public.identities_vault;

CREATE POLICY "identities_vault_select_structure_role"
ON public.identities_vault FOR SELECT
TO authenticated
USING (
  -- Must be in same structure AND have appropriate role
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.structure_id = identities_vault.structure_id
    AND om.is_active = true
    AND om.org_role IN ('owner', 'admin', 'coordinator', 'doctor', 'ipa', 'nurse')
  )
);