
-- =====================================================
-- MIGRATION: Renforcement de la protection des données sensibles
-- Objectif: Protéger le NIR (identities_vault) et les coordonnées (patients)
-- =====================================================

-- 1. Créer une vue sécurisée pour patients sans les données de contact sensibles
DROP VIEW IF EXISTS public.patients_safe;
CREATE VIEW public.patients_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  first_name,
  last_name,
  dob,
  sex,
  CASE WHEN email IS NOT NULL AND email != '' THEN '***@***' ELSE NULL END as email_masked,
  CASE WHEN phone IS NOT NULL AND phone != '' THEN '***-***-****' ELSE NULL END as phone_masked,
  note_admin,
  created_at,
  updated_at,
  structure_id,
  primary_practitioner_user_id,
  is_archived,
  origin_type,
  origin_referrer_name,
  origin_notes,
  origin,
  status,
  closed_at,
  closed_by,
  team_id
FROM public.patients;

COMMENT ON VIEW public.patients_safe IS 'Vue sécurisée patients - masque email et téléphone';

-- 2. Créer une vue sécurisée pour identities_vault sans le NIR
DROP VIEW IF EXISTS public.identities_vault_safe;
CREATE VIEW public.identities_vault_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  patient_uuid,
  first_name,
  last_name,
  CASE WHEN phone IS NOT NULL AND phone != '' 
    THEN '******' || RIGHT(phone, 2) 
    ELSE NULL 
  END as phone_masked,
  CASE WHEN nir IS NOT NULL AND nir != '' 
    THEN LEFT(nir, 5) || '**********' 
    ELSE NULL 
  END as nir_masked,
  date_of_birth,
  structure_id,
  created_at,
  updated_at
FROM public.identities_vault;

COMMENT ON VIEW public.identities_vault_safe IS 'Vue sécurisée identités - masque NIR et données sensibles';

-- 3. Créer une fonction pour vérifier l'accès aux données sensibles patient
CREATE OR REPLACE FUNCTION public.can_access_patient_sensitive_data(
  _user_id uuid,
  _patient_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_structure_id uuid;
  _patient_structure_id uuid;
  _is_authorized_role boolean;
BEGIN
  SELECT structure_id INTO _user_structure_id
  FROM public.org_members
  WHERE user_id = _user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT structure_id INTO _patient_structure_id
  FROM public.patients
  WHERE id = _patient_id;

  IF _user_structure_id IS NULL OR _user_structure_id != _patient_structure_id THEN
    RETURN false;
  END IF;

  -- Roles autorisés: admin, coordinator, practitioner, nurse, ipa avec relation de soin
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = _user_id
      AND om.structure_id = _user_structure_id
      AND om.is_active = true
      AND (
        om.org_role IN ('owner', 'admin', 'coordinator')
        OR (
          om.org_role IN ('practitioner', 'ipa', 'nurse')
          AND (
            EXISTS (SELECT 1 FROM patients p WHERE p.id = _patient_id AND p.primary_practitioner_user_id = _user_id)
            OR EXISTS (
              SELECT 1 FROM appointments a
              JOIN team_members tm ON tm.id = a.practitioner_id
              WHERE a.patient_id = _patient_id
                AND tm.user_id = _user_id
                AND a.start_time >= NOW() - INTERVAL '7 days'
            )
          )
        )
      )
  ) INTO _is_authorized_role;

  RETURN _is_authorized_role;
END;
$$;

COMMENT ON FUNCTION public.can_access_patient_sensitive_data IS 'Vérifie accès aux données sensibles patient (email, phone)';

-- 4. Créer une fonction pour vérifier l'accès au NIR (plus restrictif)
CREATE OR REPLACE FUNCTION public.can_access_patient_nir(
  _user_id uuid,
  _patient_uuid uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_structure_id uuid;
  _vault_structure_id uuid;
BEGIN
  SELECT structure_id INTO _user_structure_id
  FROM public.org_members
  WHERE user_id = _user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT structure_id INTO _vault_structure_id
  FROM public.identities_vault
  WHERE patient_uuid = _patient_uuid;

  IF _user_structure_id IS NULL OR _user_structure_id != _vault_structure_id THEN
    RETURN false;
  END IF;

  -- Seuls admin et coordinator peuvent accéder au NIR
  RETURN EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = _user_id
      AND om.structure_id = _user_structure_id
      AND om.is_active = true
      AND om.org_role IN ('owner', 'admin', 'coordinator')
  );
END;
$$;

COMMENT ON FUNCTION public.can_access_patient_nir IS 'Vérifie accès au NIR (uniquement admin/coordinator)';

-- 5. Renforcer la politique identities_vault SELECT
DROP POLICY IF EXISTS "identities_vault_select_care_relationship" ON public.identities_vault;
DROP POLICY IF EXISTS "identities_vault_select_strict_structure" ON public.identities_vault;

CREATE POLICY "identities_vault_select_authorized"
ON public.identities_vault
FOR SELECT
TO authenticated
USING (
  (structure_id = get_user_structure_id(auth.uid())) AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'coordinator'::app_role) OR
    (
      (has_role(auth.uid(), 'practitioner'::app_role) OR 
       has_role(auth.uid(), 'ipa'::app_role) OR 
       has_role(auth.uid(), 'nurse'::app_role)) 
      AND can_access_patient_vault(auth.uid(), patient_uuid)
    )
  )
);

-- 6. Créer une table d'audit pour les accès aux données sensibles
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  structure_id uuid NOT NULL,
  patient_id uuid,
  patient_uuid uuid,
  data_type text NOT NULL CHECK (data_type IN ('nir', 'email', 'phone', 'contact_info', 'ssn')),
  access_reason text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sensitive_data_log_insert_own" ON public.sensitive_data_access_log;
CREATE POLICY "sensitive_data_log_insert_own"
ON public.sensitive_data_access_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sensitive_data_log_select_admin" ON public.sensitive_data_access_log;
CREATE POLICY "sensitive_data_log_select_admin"
ON public.sensitive_data_access_log
FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid()) AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
);

CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_log_structure_date 
ON public.sensitive_data_access_log(structure_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_log_patient 
ON public.sensitive_data_access_log(patient_id, accessed_at DESC);

COMMENT ON TABLE public.sensitive_data_access_log IS 'Journal accès données sensibles (NIR, email, phone) - conformité RGPD';
