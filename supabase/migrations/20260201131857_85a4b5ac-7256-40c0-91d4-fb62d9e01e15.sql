-- =====================================================
-- SECURITY HARDENING: Fix error-level security findings
-- =====================================================

-- 1. FIX: profiles_table_public_exposure
-- Replace the overly permissive profiles_minimal_access policy with stricter structure isolation
DROP POLICY IF EXISTS "profiles_minimal_access" ON public.profiles;

CREATE POLICY "profiles_structure_isolated_access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  (user_id = auth.uid())
  OR
  -- Admins/coordinators can see profiles of users in THEIR SINGLE active structure only
  EXISTS (
    SELECT 1 FROM org_members viewer_om
    JOIN org_members target_om ON target_om.structure_id = viewer_om.structure_id
    WHERE viewer_om.user_id = auth.uid()
    AND viewer_om.is_active = true
    AND viewer_om.org_role IN ('owner', 'admin', 'coordinator')
    AND target_om.user_id = profiles.user_id
    AND target_om.is_active = true
    AND viewer_om.structure_id = get_user_structure_id(auth.uid()) -- Enforce single structure
  )
  OR
  -- Medical staff can view team member profiles within their single structure
  EXISTS (
    SELECT 1 FROM org_members viewer_om
    JOIN org_members target_om ON target_om.structure_id = viewer_om.structure_id
    WHERE viewer_om.user_id = auth.uid()
    AND viewer_om.is_active = true
    AND viewer_om.org_role IN ('doctor', 'ipa', 'nurse')
    AND target_om.user_id = profiles.user_id
    AND target_om.is_active = true
    AND viewer_om.structure_id = get_user_structure_id(auth.uid()) -- Enforce single structure
  )
);

-- 2. FIX: identities_vault_inadequate_protection
-- Remove duplicate INSERT policy and add stricter controls
DROP POLICY IF EXISTS "identities_vault_insert_staff" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_insert_authorized" ON public.identities_vault;

-- Single INSERT policy with explicit created_by tracking
CREATE POLICY "identities_vault_insert_authorized"
ON public.identities_vault
FOR INSERT
TO authenticated
WITH CHECK (
  (structure_id = get_user_structure_id(auth.uid()))
  AND (created_by = auth.uid()) -- Always track who created
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'coordinator'::app_role) 
    OR has_role(auth.uid(), 'practitioner'::app_role)
    -- Note: nurses and IPAs can READ but not CREATE patient identities
    -- They should be created by practitioners or admin/coordinators
  )
);

-- 3. FIX: org_members_cross_structure_leak  
-- Replace public role with authenticated and enforce single structure context
DROP POLICY IF EXISTS "org_members_select_same_structure" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete_by_admin" ON public.org_members;
DROP POLICY IF EXISTS "org_members_update_by_admin" ON public.org_members;

-- SELECT: Users see members of their active structure only
CREATE POLICY "org_members_select_same_structure"
ON public.org_members
FOR SELECT
TO authenticated
USING (
  -- Can see members in their current active structure
  structure_id = get_user_structure_id(auth.uid())
  OR
  -- Or their own membership records (to list their structures)
  user_id = auth.uid()
);

-- DELETE: Only structure admin can delete (not owners)
CREATE POLICY "org_members_delete_by_admin"
ON public.org_members
FOR DELETE
TO authenticated
USING (
  is_structure_admin(auth.uid(), structure_id) 
  AND org_role <> 'owner'::org_role
);

-- UPDATE: Own record or structure admin
CREATE POLICY "org_members_update_by_admin"
ON public.org_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_structure_admin(auth.uid(), structure_id)
);

-- 4. FIX: patients_table_broad_access
-- Replace with role-based access control
DROP POLICY IF EXISTS "patients_structure_members_can_view" ON public.patients;

CREATE POLICY "patients_role_based_access"
ON public.patients
FOR SELECT
TO authenticated
USING (
  -- Structure must match user's active structure
  structure_id = get_user_structure_id(auth.uid())
  AND
  -- Must have appropriate clinical or admin role
  (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
    -- Note: assistants and basic members cannot view patient records
  )
);

-- 5. CLEANUP: Ensure no duplicate policies exist
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Keep only the properly named policies
-- (The other insert/update policies with similar names will remain)