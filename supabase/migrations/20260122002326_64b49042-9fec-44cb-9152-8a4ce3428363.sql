-- =====================================================
-- SPRINT 1: MATRICE RBAC + FEATURE FLAGS
-- =====================================================

-- 1. Table des feature flags par structure
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID REFERENCES public.structures(id) ON DELETE CASCADE NOT NULL,
  flag_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(structure_id, flag_name)
);

-- 2. Table matrice rôles × actions (permissions globales)
CREATE TABLE IF NOT EXISTS public.role_action_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  resource_type TEXT NOT NULL, -- 'patients', 'transcripts', 'consultations', 'cotation', 'documents', 'inbox'
  action TEXT NOT NULL, -- 'read', 'create', 'update', 'delete', 'validate', 'export'
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  requires_health_data_flag BOOLEAN NOT NULL DEFAULT false, -- Si true, vérifie health_data_enabled
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, resource_type, action)
);

-- 3. Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_action_permissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies pour feature_flags
CREATE POLICY "feature_flags_select_authenticated" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (
    structure_id IN (
      SELECT structure_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "feature_flags_admin_manage" ON public.feature_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND structure_id = feature_flags.structure_id 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- 5. RLS Policies pour role_action_permissions (lecture seule pour tous authentifiés)
CREATE POLICY "role_action_permissions_select" ON public.role_action_permissions
  FOR SELECT TO authenticated
  USING (true);

-- 6. Fonction pour vérifier si une feature flag est active
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_structure_id UUID, p_flag_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.feature_flags 
     WHERE structure_id = p_structure_id AND flag_name = p_flag_name),
    false
  );
$$;

-- 7. Fonction pour vérifier si un rôle peut effectuer une action
CREATE OR REPLACE FUNCTION public.can_perform_action(
  p_user_id UUID, 
  p_structure_id UUID, 
  p_resource_type TEXT, 
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role public.app_role;
  v_permission RECORD;
BEGIN
  -- Récupérer le rôle de l'utilisateur pour cette structure
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = p_user_id 
    AND structure_id = p_structure_id 
    AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Vérifier la permission
  SELECT * INTO v_permission
  FROM public.role_action_permissions
  WHERE role = v_user_role 
    AND resource_type = p_resource_type 
    AND action = p_action;
  
  IF v_permission IS NULL OR NOT v_permission.is_allowed THEN
    RETURN false;
  END IF;
  
  -- Si la ressource nécessite health_data_enabled, vérifier le flag
  IF v_permission.requires_health_data_flag THEN
    RETURN public.is_feature_enabled(p_structure_id, 'health_data_enabled');
  END IF;
  
  RETURN true;
END;
$$;

-- 8. Insérer la matrice de permissions par défaut
INSERT INTO public.role_action_permissions (role, resource_type, action, is_allowed, requires_health_data_flag, description) VALUES
-- ASSISTANTE: accès limité, pas de validation médicale
('assistant', 'patients', 'read', true, true, 'Lecture fiches patients'),
('assistant', 'patients', 'create', true, true, 'Création fiches patients'),
('assistant', 'patients', 'update', false, true, 'Modification fiches patients'),
('assistant', 'patients', 'delete', false, true, 'Suppression fiches patients'),
('assistant', 'transcripts', 'read', true, true, 'Lecture transcriptions'),
('assistant', 'transcripts', 'create', true, true, 'Upload transcriptions'),
('assistant', 'transcripts', 'validate', false, true, 'Validation médicale transcriptions'),
('assistant', 'consultations', 'read', false, true, 'Lecture consultations'),
('assistant', 'consultations', 'create', false, true, 'Création consultations'),
('assistant', 'consultations', 'validate', false, true, 'Validation consultations'),
('assistant', 'cotation', 'read', true, false, 'Lecture cotation'),
('assistant', 'cotation', 'create', true, false, 'Préparation cotation'),
('assistant', 'cotation', 'validate', false, false, 'Validation cotation'),
('assistant', 'documents', 'read', true, true, 'Lecture documents'),
('assistant', 'documents', 'create', true, true, 'Upload documents'),
('assistant', 'documents', 'delete', false, true, 'Suppression documents'),
('assistant', 'inbox', 'read', true, false, 'Lecture messagerie'),
('assistant', 'inbox', 'create', true, false, 'Envoi messages'),
('assistant', 'queue', 'read', true, false, 'Lecture file attente'),
('assistant', 'queue', 'create', true, false, 'Ajout file attente'),
('assistant', 'queue', 'update', true, false, 'Gestion file attente'),

-- COORDINATOR: accès étendu sauf validation médicale
('coordinator', 'patients', 'read', true, true, 'Lecture fiches patients'),
('coordinator', 'patients', 'create', true, true, 'Création fiches patients'),
('coordinator', 'patients', 'update', true, true, 'Modification fiches patients'),
('coordinator', 'patients', 'delete', false, true, 'Suppression fiches patients'),
('coordinator', 'transcripts', 'read', true, true, 'Lecture transcriptions'),
('coordinator', 'transcripts', 'create', true, true, 'Upload transcriptions'),
('coordinator', 'transcripts', 'validate', false, true, 'Validation médicale transcriptions'),
('coordinator', 'consultations', 'read', true, true, 'Lecture consultations'),
('coordinator', 'consultations', 'create', true, true, 'Préparation consultations'),
('coordinator', 'consultations', 'validate', false, true, 'Validation consultations'),
('coordinator', 'cotation', 'read', true, false, 'Lecture cotation'),
('coordinator', 'cotation', 'create', true, false, 'Préparation cotation'),
('coordinator', 'cotation', 'validate', false, false, 'Validation cotation'),
('coordinator', 'documents', 'read', true, true, 'Lecture documents'),
('coordinator', 'documents', 'create', true, true, 'Upload documents'),
('coordinator', 'documents', 'delete', true, true, 'Suppression documents'),
('coordinator', 'inbox', 'read', true, false, 'Lecture messagerie'),
('coordinator', 'inbox', 'create', true, false, 'Envoi messages'),
('coordinator', 'queue', 'read', true, false, 'Lecture file attente'),
('coordinator', 'queue', 'create', true, false, 'Ajout file attente'),
('coordinator', 'queue', 'update', true, false, 'Gestion file attente'),
('coordinator', 'team', 'read', true, false, 'Lecture équipe'),
('coordinator', 'team', 'update', true, false, 'Gestion équipe'),

-- PRACTITIONER (médecin/IPA): accès complet médical
('practitioner', 'patients', 'read', true, true, 'Lecture fiches patients'),
('practitioner', 'patients', 'create', true, true, 'Création fiches patients'),
('practitioner', 'patients', 'update', true, true, 'Modification fiches patients'),
('practitioner', 'patients', 'delete', true, true, 'Archivage fiches patients'),
('practitioner', 'transcripts', 'read', true, true, 'Lecture transcriptions'),
('practitioner', 'transcripts', 'create', true, true, 'Upload transcriptions'),
('practitioner', 'transcripts', 'validate', true, true, 'Validation médicale transcriptions'),
('practitioner', 'consultations', 'read', true, true, 'Lecture consultations'),
('practitioner', 'consultations', 'create', true, true, 'Création consultations'),
('practitioner', 'consultations', 'update', true, true, 'Modification consultations'),
('practitioner', 'consultations', 'validate', true, true, 'Validation consultations'),
('practitioner', 'cotation', 'read', true, false, 'Lecture cotation'),
('practitioner', 'cotation', 'create', true, false, 'Création cotation'),
('practitioner', 'cotation', 'validate', true, false, 'Validation cotation'),
('practitioner', 'documents', 'read', true, true, 'Lecture documents'),
('practitioner', 'documents', 'create', true, true, 'Upload documents'),
('practitioner', 'documents', 'delete', true, true, 'Suppression documents'),
('practitioner', 'inbox', 'read', true, false, 'Lecture messagerie'),
('practitioner', 'inbox', 'create', true, false, 'Envoi messages'),
('practitioner', 'queue', 'read', true, false, 'Lecture file attente'),
('practitioner', 'queue', 'create', true, false, 'Ajout file attente'),
('practitioner', 'queue', 'update', true, false, 'Gestion file attente'),

-- ADMIN: accès organisationnel, pas de contenu clinique direct
('admin', 'patients', 'read', false, true, 'Lecture fiches patients'),
('admin', 'patients', 'create', false, true, 'Création fiches patients'),
('admin', 'patients', 'update', false, true, 'Modification fiches patients'),
('admin', 'patients', 'delete', false, true, 'Suppression fiches patients'),
('admin', 'transcripts', 'read', false, true, 'Lecture transcriptions'),
('admin', 'transcripts', 'create', false, true, 'Upload transcriptions'),
('admin', 'transcripts', 'validate', false, true, 'Validation médicale transcriptions'),
('admin', 'consultations', 'read', false, true, 'Lecture consultations'),
('admin', 'consultations', 'create', false, true, 'Création consultations'),
('admin', 'consultations', 'validate', false, true, 'Validation consultations'),
('admin', 'cotation', 'read', true, false, 'Lecture cotation'),
('admin', 'cotation', 'create', false, false, 'Création cotation'),
('admin', 'cotation', 'validate', false, false, 'Validation cotation'),
('admin', 'cotation', 'export', true, false, 'Export cotation'),
('admin', 'documents', 'read', false, true, 'Lecture documents'),
('admin', 'documents', 'create', false, true, 'Upload documents'),
('admin', 'documents', 'delete', false, true, 'Suppression documents'),
('admin', 'inbox', 'read', true, false, 'Lecture messagerie'),
('admin', 'inbox', 'create', true, false, 'Envoi messages'),
('admin', 'queue', 'read', true, false, 'Lecture file attente'),
('admin', 'queue', 'create', true, false, 'Ajout file attente'),
('admin', 'queue', 'update', true, false, 'Gestion file attente'),
('admin', 'team', 'read', true, false, 'Lecture équipe'),
('admin', 'team', 'create', true, false, 'Création membres équipe'),
('admin', 'team', 'update', true, false, 'Gestion équipe'),
('admin', 'team', 'delete', true, false, 'Suppression membres équipe'),
('admin', 'settings', 'read', true, false, 'Lecture paramètres'),
('admin', 'settings', 'update', true, false, 'Modification paramètres'),
('admin', 'audit', 'read', true, false, 'Lecture logs audit'),
('admin', 'compliance', 'read', true, false, 'Lecture conformité')
ON CONFLICT (role, resource_type, action) DO NOTHING;

-- 9. Trigger pour updated_at sur feature_flags
CREATE OR REPLACE FUNCTION public.update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_flags_updated_at();

-- 10. Activer realtime pour feature_flags
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;