-- =====================================================
-- CRITICAL SECURITY HARDENING
-- Restrict profiles and identities_vault access
-- =====================================================

-- 1. PROFILES: Remove overly permissive policies and create stricter ones
-- =====================================================

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "profiles_strict_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_structure" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_structure_strict" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create strict policy: users can only see their own profile OR profiles in their structure with legitimate need
CREATE POLICY "profiles_minimal_access"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Own profile is always visible
  user_id = auth.uid()
  OR
  -- Only admin/coordinator/owner can see all profiles in their structure
  EXISTS (
    SELECT 1 FROM public.org_members viewer_om
    JOIN public.org_members target_om ON target_om.structure_id = viewer_om.structure_id
    WHERE viewer_om.user_id = auth.uid()
    AND viewer_om.is_active = true
    AND viewer_om.org_role IN ('owner', 'admin', 'coordinator')
    AND target_om.user_id = profiles.user_id
    AND target_om.is_active = true
  )
  OR
  -- Medical staff can only see profiles of team members they work with (same team_members entries)
  EXISTS (
    SELECT 1 FROM public.org_members viewer_om
    JOIN public.team_members viewer_tm ON viewer_tm.user_id = viewer_om.user_id
    JOIN public.team_members target_tm ON target_tm.structure_id = viewer_tm.structure_id
    JOIN public.org_members target_om ON target_om.user_id = target_tm.user_id
    WHERE viewer_om.user_id = auth.uid()
    AND viewer_om.is_active = true
    AND target_om.user_id = profiles.user_id
    AND target_om.is_active = true
  )
);

-- 2. IDENTITIES_VAULT: Require access logging for sensitive data
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "identities_vault_strict_medical_access" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_select_authorized" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_select_structure_role" ON public.identities_vault;

-- Create function to log and verify access to sensitive patient data
CREATE OR REPLACE FUNCTION public.can_access_patient_identity(
  p_structure_id UUID,
  p_patient_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN := FALSE;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is in the structure with appropriate role
  SELECT om.org_role INTO v_role
  FROM public.org_members om
  WHERE om.user_id = v_user_id
  AND om.structure_id = p_structure_id
  AND om.is_active = true
  AND om.org_role IN ('owner', 'admin', 'coordinator', 'doctor', 'ipa', 'nurse');
  
  IF v_role IS NOT NULL THEN
    v_has_access := TRUE;
    
    -- Log access to sensitive data (audit trail)
    INSERT INTO public.data_access_log (
      user_id,
      structure_id,
      resource_type,
      resource_id,
      action_type,
      access_reason,
      access_reason_category,
      fields_accessed
    ) VALUES (
      v_user_id,
      p_structure_id,
      'identities_vault',
      p_patient_uuid::text,
      'read',
      'RLS policy access check',
      'clinical_care',
      ARRAY['first_name', 'last_name', 'nir', 'email', 'phone', 'date_of_birth']
    );
  END IF;
  
  RETURN v_has_access;
END;
$$;

-- Create stricter policy with access logging
CREATE POLICY "identities_vault_audited_access"
ON public.identities_vault FOR SELECT
TO authenticated
USING (
  public.can_access_patient_identity(structure_id, patient_uuid)
);

-- 3. Revoke anonymous access
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.identities_vault FROM anon;