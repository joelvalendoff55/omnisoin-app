-- =====================================================
-- SECURITY FIX: Revoke anonymous access and restrict policies to authenticated users
-- =====================================================

-- 1. REVOKE anon permissions from patient_messages table
REVOKE ALL ON public.patient_messages FROM anon;

-- 2. FIX patients table - replace public policy with authenticated-only
DROP POLICY IF EXISTS "patients_structure_members_can_view" ON public.patients;

CREATE POLICY "patients_structure_members_can_view"
ON public.patients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid()
    AND om.structure_id = patients.structure_id
    AND om.is_active = true
  )
);

-- 3. FIX identities_vault - replace public policies with authenticated-only
DROP POLICY IF EXISTS "identities_vault_insert_staff" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_update_staff" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_no_delete" ON public.identities_vault;

CREATE POLICY "identities_vault_insert_staff"
ON public.identities_vault
FOR INSERT
TO authenticated
WITH CHECK (
  (structure_id = get_user_structure_id(auth.uid())) 
  AND (created_by = auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'coordinator'::app_role) 
    OR has_role(auth.uid(), 'practitioner'::app_role)
  )
);

CREATE POLICY "identities_vault_update_staff"
ON public.identities_vault
FOR UPDATE
TO authenticated
USING (
  (structure_id = get_user_structure_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'coordinator'::app_role)
  )
)
WITH CHECK (
  (structure_id = get_user_structure_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'coordinator'::app_role)
  )
);

CREATE POLICY "identities_vault_no_delete"
ON public.identities_vault
FOR DELETE
TO authenticated
USING (false);

-- 4. Ensure profiles table has no anon access
REVOKE ALL ON public.profiles FROM anon;

-- 5. Ensure patients table has no anon access
REVOKE ALL ON public.patients FROM anon;

-- 6. Ensure identities_vault has no anon access
REVOKE ALL ON public.identities_vault FROM anon;

-- 7. Ensure consultations has no anon access
REVOKE ALL ON public.consultations FROM anon;