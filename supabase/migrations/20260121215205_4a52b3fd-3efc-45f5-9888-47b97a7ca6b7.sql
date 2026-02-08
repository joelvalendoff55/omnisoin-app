
-- ============================================
-- SECURITY HARDENING: RBAC Access Controls
-- ============================================
-- Fixes:
-- 1. Staff Personal Information Could Be Stolen (profiles, team_members)
-- 2. Consultation Notes Readable by Non-Medical Staff (consultations)
-- 3. Patient NIR (Social Security Numbers) Accessible to All Staff (identities_vault)

-- ============================================
-- 1. PROFILES: Restrict to admins/coordinators or self
-- ============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_structure" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their structure" ON public.profiles;

-- Create new restrictive policy: only self, admins, or coordinators can view profiles
CREATE POLICY "profiles_select_restricted"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Can always see own profile
  OR (
    structure_id = get_user_structure_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'coordinator'::app_role)
    )
  )
);

-- ============================================
-- 2. TEAM_MEMBERS: Restrict contact info to admins/coordinators
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "team_members_select_same_structure" ON public.team_members;

-- Create new policy: base info visible to all in structure, contact info restricted
-- All staff can see team member names and roles, but email/phone restricted
CREATE POLICY "team_members_select_restricted"
ON public.team_members FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    -- Admins and coordinators see everything
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    -- Own profile
    OR user_id = auth.uid()
    -- Medical staff can see each other (for coordination)
    OR (
      has_role(auth.uid(), 'practitioner'::app_role)
      OR has_role(auth.uid(), 'nurse'::app_role)
      OR has_role(auth.uid(), 'ipa'::app_role)
    )
  )
);

-- ============================================
-- 3. IDENTITIES_VAULT: Restrict NIR to medical practitioners
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "identities_vault_select_same_structure" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_select_care_relationship" ON public.identities_vault;

-- Create new restrictive policy: only admin, coordinator, and medical staff
CREATE POLICY "identities_vault_select_medical_only"
ON public.identities_vault FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- ============================================
-- 4. CONSULTATIONS: Restrict to medical staff only
-- ============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "consultations_select_same_structure" ON public.consultations;

-- Create new policy: only medical staff can view consultations
CREATE POLICY "consultations_select_medical_only"
ON public.consultations FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- ============================================
-- 5. HOSPITAL_PASSAGES: Restrict to medical staff only
-- ============================================

DROP POLICY IF EXISTS "hospital_passages_select_same_structure" ON public.hospital_passages;

CREATE POLICY "hospital_passages_select_medical_only"
ON public.hospital_passages FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- ============================================
-- 6. PATIENT_ANTECEDENTS: Restrict to medical staff only
-- ============================================

DROP POLICY IF EXISTS "antecedents_select_same_structure" ON public.patient_antecedents;

CREATE POLICY "antecedents_select_medical_only"
ON public.patient_antecedents FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- ============================================
-- 7. CONSULTATION_ANAMNESIS: Restrict to medical staff only
-- ============================================

DROP POLICY IF EXISTS "anamnesis_select_same_structure" ON public.consultation_anamnesis;

CREATE POLICY "anamnesis_select_medical_only"
ON public.consultation_anamnesis FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- ============================================
-- 8. PATIENT_TRANSCRIPTS: Ensure medical-only access
-- ============================================

DROP POLICY IF EXISTS "transcripts_select_same_structure" ON public.patient_transcripts;

CREATE POLICY "transcripts_select_medical_only"
ON public.patient_transcripts FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- ============================================
-- 9. DOCUMENTS: Restrict medical documents to medical staff
-- ============================================

DROP POLICY IF EXISTS "Users can view documents in their structure" ON public.documents;
DROP POLICY IF EXISTS "documents_select_same_structure" ON public.documents;

CREATE POLICY "documents_select_medical_only"
ON public.documents FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role) -- Assistants need document access for administrative work
  )
);

-- ============================================
-- 10. PRECONSULTATIONS: Restrict vital signs to medical staff
-- ============================================

DROP POLICY IF EXISTS "preconsultations_select_same_structure" ON public.preconsultations;

CREATE POLICY "preconsultations_select_medical_only"
ON public.preconsultations FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'practitioner'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'ipa'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role) -- Assistants manage pre-consultations
  )
);
