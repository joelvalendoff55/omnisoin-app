-- =====================================================
-- SECURITY HARDENING - STRICT RLS POLICIES
-- Remove permissive policies and create strict ones
-- =====================================================

-- 1. PROFILES TABLE - Remove old permissive policies and keep strict one
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their structure" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Keep only the strict policy we created (profiles_select_same_structure_strict)
-- But also ensure own profile access
DROP POLICY IF EXISTS "profiles_select_same_structure_strict" ON public.profiles;

CREATE POLICY "profiles_strict_access"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Own profile is always visible
  user_id = auth.uid()
  OR
  -- Only profiles of users in the same structure(s)
  EXISTS (
    SELECT 1 FROM public.org_members my_om
    JOIN public.org_members their_om ON their_om.structure_id = my_om.structure_id
    WHERE my_om.user_id = auth.uid()
    AND my_om.is_active = true
    AND their_om.user_id = profiles.user_id
    AND their_om.is_active = true
  )
);

-- 2. IDENTITIES_VAULT - Make policies stricter
-- =====================================================
DROP POLICY IF EXISTS "identities_vault_select_authorized" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_select_structure_role" ON public.identities_vault;

CREATE POLICY "identities_vault_strict_medical_access"
ON public.identities_vault FOR SELECT
TO authenticated
USING (
  -- Must be in same structure AND have medical role
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.structure_id = identities_vault.structure_id
    AND om.is_active = true
    AND om.org_role IN ('owner', 'admin', 'coordinator', 'doctor', 'ipa', 'nurse')
  )
);

-- 3. CONSULTATIONS - Strengthen with org_members
-- =====================================================
DROP POLICY IF EXISTS "consultations_select_care_relationship" ON public.consultations;

CREATE POLICY "consultations_strict_access"
ON public.consultations FOR SELECT
TO authenticated
USING (
  -- Must be in same structure with medical role
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.structure_id = consultations.structure_id
    AND om.is_active = true
    AND om.org_role IN ('owner', 'admin', 'coordinator', 'doctor', 'ipa', 'nurse')
  )
);

-- 4. PATIENTS - Strengthen access
-- =====================================================
DROP POLICY IF EXISTS "patients_select_care_relationship" ON public.patients;
DROP POLICY IF EXISTS "Allow read access for structure members" ON public.patients;

CREATE POLICY "patients_strict_access"
ON public.patients FOR SELECT
TO authenticated
USING (
  -- Must be in same structure
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.structure_id = patients.structure_id
    AND om.is_active = true
  )
);

-- 5. MEDICAL_RECORDS - Strengthen with org_members
-- =====================================================
DROP POLICY IF EXISTS "Users can view medical records for accessible patients" ON public.medical_records;

CREATE POLICY "medical_records_strict_access"
ON public.medical_records FOR SELECT
TO authenticated
USING (
  -- Must be medical staff in the patient's structure
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.org_members om ON om.structure_id = p.structure_id
    WHERE p.id = medical_records.patient_id
    AND om.user_id = auth.uid()
    AND om.is_active = true
    AND om.org_role IN ('owner', 'admin', 'coordinator', 'doctor', 'ipa', 'nurse')
  )
);