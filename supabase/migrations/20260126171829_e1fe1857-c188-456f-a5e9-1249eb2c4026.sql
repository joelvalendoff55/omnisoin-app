-- =====================================================
-- SECURITY FIX: Add RLS policies for exposed tables/views
-- This migration secures 5 critical security vulnerabilities
-- =====================================================

-- 1. PROFILES TABLE - Staff Personal Information
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create restrictive policies for profiles
CREATE POLICY "Users can view profiles in their structure"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om1
    WHERE om1.user_id = auth.uid() AND om1.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.org_members om2
      WHERE om2.user_id = public.profiles.user_id 
      AND om2.structure_id = om1.structure_id
      AND om2.is_active = true
    )
  )
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2. IDENTITIES_VAULT_SAFE VIEW - Patient Identity Data
DROP VIEW IF EXISTS public.identities_vault_safe;
CREATE VIEW public.identities_vault_safe
WITH (security_invoker = on)
AS SELECT
  id,
  structure_id,
  patient_uuid,
  CASE 
    WHEN LENGTH(first_name) > 2 THEN SUBSTRING(first_name, 1, 2) || '***'
    ELSE '***'
  END AS first_name_masked,
  CASE 
    WHEN LENGTH(last_name) > 1 THEN SUBSTRING(last_name, 1, 1) || '***'
    ELSE '***'
  END AS last_name_masked,
  CASE 
    WHEN nir IS NOT NULL THEN '***' || RIGHT(nir, 2)
    ELSE NULL
  END AS nir_masked,
  CASE 
    WHEN phone IS NOT NULL THEN '****' || RIGHT(phone, 4)
    ELSE NULL
  END AS phone_masked,
  CASE 
    WHEN email IS NOT NULL THEN SUBSTRING(email, 1, 2) || '***@***'
    ELSE NULL
  END AS email_masked,
  date_of_birth,
  created_at
FROM public.identities_vault
WHERE EXISTS (
  SELECT 1 FROM public.org_members
  WHERE org_members.user_id = auth.uid()
  AND org_members.structure_id = identities_vault.structure_id
  AND org_members.is_active = true
);

-- 3. ORG_MEMBERS_WITH_DETAILS VIEW - Organization Structure
DROP VIEW IF EXISTS public.org_members_with_details;
CREATE VIEW public.org_members_with_details
WITH (security_invoker = on)
AS SELECT
  om.id,
  om.user_id,
  om.structure_id,
  om.org_role,
  om.is_active,
  om.created_at,
  om.updated_at,
  p.first_name,
  p.last_name,
  p.specialty,
  p.phone,
  s.name AS structure_name
FROM public.org_members om
LEFT JOIN public.profiles p ON om.user_id = p.user_id
LEFT JOIN public.structures s ON om.structure_id = s.id
WHERE om.is_active = true
AND EXISTS (
  SELECT 1 FROM public.org_members viewer
  WHERE viewer.user_id = auth.uid()
  AND viewer.structure_id = om.structure_id
  AND viewer.is_active = true
);

-- 4. EXPORT_AUDIT_TIMELINE VIEW - Data Export Audit Trail
DROP VIEW IF EXISTS public.export_audit_timeline;
CREATE VIEW public.export_audit_timeline
WITH (security_invoker = on)
AS SELECT
  er.id,
  er.structure_id,
  er.requester_id,
  er.export_type,
  er.export_format,
  er.status,
  er.justification,
  er.legal_basis,
  er.patient_id,
  er.created_at,
  er.completed_at,
  er.expiration_date,
  er.file_hash,
  p.first_name AS requester_first_name,
  p.last_name AS requester_last_name
FROM public.export_requests er
LEFT JOIN public.profiles p ON er.requester_id = p.user_id
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = er.structure_id
  AND om.is_active = true
  AND om.org_role IN ('owner', 'admin', 'coordinator')
);

-- 5. SYSTEM_COMPLIANCE_DASHBOARD VIEW - Security Compliance Status
DROP VIEW IF EXISTS public.system_compliance_dashboard;
CREATE VIEW public.system_compliance_dashboard
WITH (security_invoker = on)
AS SELECT
  s.id AS structure_id,
  s.name AS structure_name,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS total_tables,
  (SELECT COUNT(*) FROM public.patients WHERE structure_id = s.id) AS patient_count,
  (SELECT COUNT(*) FROM public.org_members WHERE structure_id = s.id AND is_active = true) AS active_users,
  (SELECT COUNT(*) FROM public.patient_consents WHERE structure_id = s.id) AS consent_count,
  (SELECT COUNT(*) FROM public.immutable_audit_log WHERE structure_id = s.id) AS audit_log_count,
  (SELECT COUNT(*) FROM public.structure_isolation_alerts WHERE target_structure_id = s.id AND resolved_at IS NULL) AS unresolved_alerts
FROM public.structures s
WHERE EXISTS (
  SELECT 1 FROM public.org_members om
  WHERE om.user_id = auth.uid()
  AND om.structure_id = s.id
  AND om.is_active = true
  AND om.org_role IN ('owner', 'admin')
);

-- Grant appropriate permissions on views
GRANT SELECT ON public.identities_vault_safe TO authenticated;
GRANT SELECT ON public.org_members_with_details TO authenticated;
GRANT SELECT ON public.export_audit_timeline TO authenticated;
GRANT SELECT ON public.system_compliance_dashboard TO authenticated;

-- Revoke public access
REVOKE ALL ON public.identities_vault_safe FROM anon;
REVOKE ALL ON public.org_members_with_details FROM anon;
REVOKE ALL ON public.export_audit_timeline FROM anon;
REVOKE ALL ON public.system_compliance_dashboard FROM anon;
REVOKE ALL ON public.profiles FROM anon;