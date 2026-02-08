-- Security Enhancement: Add structure-aware role checking
-- This prevents potential cross-structure privilege escalation

-- Create improved version of has_role that explicitly checks structure_id
CREATE OR REPLACE FUNCTION public.has_role_in_structure(_user_id uuid, _role app_role, _structure_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND structure_id = _structure_id
      AND is_active = true
  )
$$;

-- Update can_access_patient to use structure-aware role checking
CREATE OR REPLACE FUNCTION public.can_access_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id
    AND (
      -- User must be in same structure as patient
      p.structure_id = public.get_user_structure_id(_user_id)
      AND (
        -- Check roles within patient's structure
        public.has_role_in_structure(_user_id, 'admin', p.structure_id)
        OR public.has_role_in_structure(_user_id, 'coordinator', p.structure_id)
        OR p.primary_practitioner_user_id = _user_id
        OR public.is_delegated_to_user(p.primary_practitioner_user_id, _user_id, p.structure_id)
      )
    )
  )
$$;

-- Update can_access_patient_care with explicit structure checking
CREATE OR REPLACE FUNCTION public.can_access_patient_care(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id
    AND p.structure_id = public.get_user_structure_id(_user_id)
    AND (
      -- Admins and coordinators within same structure
      public.has_role_in_structure(_user_id, 'admin', p.structure_id)
      OR public.has_role_in_structure(_user_id, 'coordinator', p.structure_id)
      -- Primary practitioner
      OR p.primary_practitioner_user_id = _user_id
      -- Delegated assistant (verified within structure)
      OR public.is_delegated_to_user(p.primary_practitioner_user_id, _user_id, p.structure_id)
      -- User created this patient record
      OR p.user_id = _user_id
      -- User has recent consultation with this patient
      OR EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.patient_id = p.id
        AND c.created_by = _user_id
        AND c.structure_id = p.structure_id
        AND c.created_at > now() - interval '30 days'
      )
      -- User has active appointment with this patient
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.team_members tm ON tm.id = a.practitioner_id
        WHERE a.patient_id = p.id
        AND tm.user_id = _user_id
        AND a.structure_id = p.structure_id
        AND a.start_time >= date_trunc('day', now())
        AND a.status NOT IN ('cancelled', 'no_show')
      )
      -- User is assigned in active queue entry
      OR EXISTS (
        SELECT 1 FROM public.patient_queue pq
        JOIN public.team_members tm ON tm.id = pq.assigned_to
        WHERE pq.patient_id = p.id
        AND tm.user_id = _user_id
        AND pq.structure_id = p.structure_id
        AND pq.status IN ('waiting', 'called', 'in_progress', 'in_consultation')
        AND pq.created_at >= date_trunc('day', now())
      )
    )
  )
$$;

-- Add explicit structure isolation check for identities_vault
DROP POLICY IF EXISTS "identities_vault_select_medical_only" ON public.identities_vault;

CREATE POLICY "identities_vault_select_strict_structure"
ON public.identities_vault FOR SELECT
TO authenticated
USING (
  -- Must be in same structure
  structure_id = get_user_structure_id(auth.uid())
  AND (
    -- Only specific roles within that structure
    has_role_in_structure(auth.uid(), 'admin'::app_role, structure_id)
    OR has_role_in_structure(auth.uid(), 'coordinator'::app_role, structure_id)
    OR has_role_in_structure(auth.uid(), 'practitioner'::app_role, structure_id)
  )
);

-- Comment explaining the security enhancement
COMMENT ON FUNCTION public.has_role_in_structure IS 
'Enhanced role checking that explicitly validates structure_id to prevent cross-structure privilege escalation. Use this instead of has_role() for all patient data access checks.';