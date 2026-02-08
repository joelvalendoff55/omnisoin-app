-- =============================================
-- SPRINT 1: DB + RLS + profils + délégations
-- =============================================

-- 1) Modifier la table patients existante pour OmniSoin Assist
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS structure_id UUID REFERENCES public.structures(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS primary_practitioner_user_id UUID,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Renommer les colonnes pour cohérence
ALTER TABLE public.patients RENAME COLUMN date_of_birth TO dob;
ALTER TABLE public.patients RENAME COLUMN gender TO sex;
ALTER TABLE public.patients RENAME COLUMN notes TO note_admin;

-- Supprimer les colonnes obsolètes pour OmniSoin
ALTER TABLE public.patients 
DROP COLUMN IF EXISTS blood_type,
DROP COLUMN IF EXISTS allergies,
DROP COLUMN IF EXISTS emergency_contact_name,
DROP COLUMN IF EXISTS emergency_contact_phone,
DROP COLUMN IF EXISTS address;

-- 2) Créer la table practitioner_assistants (délégations)
CREATE TABLE public.practitioner_assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
    practitioner_user_id UUID NOT NULL,
    assistant_user_id UUID NOT NULL,
    can_edit BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (structure_id, practitioner_user_id, assistant_user_id)
);

ALTER TABLE public.practitioner_assistants ENABLE ROW LEVEL SECURITY;

-- 3) Créer la table activity_logs (audit)
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4) Index pour performance
CREATE INDEX IF NOT EXISTS idx_patients_structure_id ON public.patients(structure_id);
CREATE INDEX IF NOT EXISTS idx_patients_primary_practitioner ON public.patients(primary_practitioner_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_is_archived ON public.patients(is_archived);

CREATE INDEX idx_practitioner_assistants_structure ON public.practitioner_assistants(structure_id);
CREATE INDEX idx_practitioner_assistants_practitioner ON public.practitioner_assistants(practitioner_user_id);
CREATE INDEX idx_practitioner_assistants_assistant ON public.practitioner_assistants(assistant_user_id);

CREATE INDEX idx_activity_logs_structure ON public.activity_logs(structure_id);
CREATE INDEX idx_activity_logs_patient ON public.activity_logs(patient_id);
CREATE INDEX idx_activity_logs_actor ON public.activity_logs(actor_user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- 5) Fonction pour vérifier les délégations
CREATE OR REPLACE FUNCTION public.is_delegated_to_user(_practitioner_user_id UUID, _assistant_user_id UUID, _structure_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practitioner_assistants
    WHERE structure_id = _structure_id
      AND practitioner_user_id = _practitioner_user_id
      AND assistant_user_id = _assistant_user_id
  )
$$;

-- 6) Fonction pour vérifier l'accès patient
CREATE OR REPLACE FUNCTION public.can_access_patient(_user_id UUID, _patient_id UUID)
RETURNS BOOLEAN
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
      public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'coordinator')
      OR p.primary_practitioner_user_id = _user_id
      OR public.is_delegated_to_user(p.primary_practitioner_user_id, _user_id, p.structure_id)
    )
  )
$$;

-- 7) RLS Policies pour patients
DROP POLICY IF EXISTS "Users can view their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete their own patients" ON public.patients;

CREATE POLICY "Users can view patients in their structure"
ON public.patients FOR SELECT TO authenticated
USING (
  structure_id = public.get_user_structure_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coordinator')
    OR primary_practitioner_user_id = auth.uid()
    OR public.is_delegated_to_user(primary_practitioner_user_id, auth.uid(), structure_id)
  )
);

CREATE POLICY "Authorized users can create patients"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (
  structure_id = public.get_user_structure_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'practitioner')
  )
);

CREATE POLICY "Authorized users can update patients"
ON public.patients FOR UPDATE TO authenticated
USING (
  structure_id = public.get_user_structure_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coordinator')
    OR primary_practitioner_user_id = auth.uid()
    OR public.is_delegated_to_user(primary_practitioner_user_id, auth.uid(), structure_id)
  )
);

CREATE POLICY "No hard delete on patients"
ON public.patients FOR DELETE TO authenticated
USING (false);

-- 8) RLS Policies pour practitioner_assistants
CREATE POLICY "Users can view delegations in their structure"
ON public.practitioner_assistants FOR SELECT TO authenticated
USING (structure_id = public.get_user_structure_id(auth.uid()));

CREATE POLICY "Admins and coordinators can manage delegations"
ON public.practitioner_assistants FOR ALL TO authenticated
USING (
  structure_id = public.get_user_structure_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
)
WITH CHECK (
  structure_id = public.get_user_structure_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
);

CREATE POLICY "Practitioners can manage their own delegations"
ON public.practitioner_assistants FOR ALL TO authenticated
USING (
  structure_id = public.get_user_structure_id(auth.uid())
  AND practitioner_user_id = auth.uid()
  AND public.has_role(auth.uid(), 'practitioner')
)
WITH CHECK (
  structure_id = public.get_user_structure_id(auth.uid())
  AND practitioner_user_id = auth.uid()
  AND public.has_role(auth.uid(), 'practitioner')
);

-- 9) RLS Policies pour activity_logs
CREATE POLICY "Users can view logs in their structure"
ON public.activity_logs FOR SELECT TO authenticated
USING (structure_id = public.get_user_structure_id(auth.uid()));

CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (
  structure_id = public.get_user_structure_id(auth.uid())
  AND actor_user_id = auth.uid()
);

CREATE POLICY "Logs are immutable - no update"
ON public.activity_logs FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "Logs are immutable - no delete"
ON public.activity_logs FOR DELETE TO authenticated
USING (false);