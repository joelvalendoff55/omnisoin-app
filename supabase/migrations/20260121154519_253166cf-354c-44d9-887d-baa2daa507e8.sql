-- =============================================================================
-- MIGRATION MULTI-TENANT MSP + RLS MÉDICO-LÉGAL (CORRIGÉE)
-- Extension de l'architecture existante (structures/user_roles)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOUVEAU TYPE ENUM POUR RÔLES ORGANISATIONNELS
-- -----------------------------------------------------------------------------

CREATE TYPE public.org_role AS ENUM (
  'owner',
  'admin',
  'doctor',
  'ipa',
  'nurse',
  'assistant',
  'coordinator',
  'viewer'
);

-- -----------------------------------------------------------------------------
-- 2. TABLE SITES (multi-sites physiques par structure)
-- -----------------------------------------------------------------------------

CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE(structure_id, slug)
);

CREATE INDEX idx_sites_structure_id ON public.sites(structure_id);
CREATE INDEX idx_sites_is_active ON public.sites(is_active) WHERE is_active = true;

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. TABLE ORG_MEMBERS
-- -----------------------------------------------------------------------------

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  org_role org_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE(user_id, structure_id)
);

CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_members_structure_id ON public.org_members(structure_id);
CREATE INDEX idx_org_members_site_id ON public.org_members(site_id);
CREATE INDEX idx_org_members_is_active ON public.org_members(is_active) WHERE is_active = true;

CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON public.org_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. FONCTIONS RLS SÉCURISÉES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _structure_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND structure_id = _structure_id
      AND is_active = true
      AND archived_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.get_org_role(_user_id UUID, _structure_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_role FROM public.org_members
  WHERE user_id = _user_id
    AND structure_id = _structure_id
    AND is_active = true
    AND archived_at IS NULL
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _structure_id UUID, _required_role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND structure_id = _structure_id
      AND is_active = true
      AND archived_at IS NULL
      AND (
        CASE org_role
          WHEN 'owner' THEN 100
          WHEN 'admin' THEN 90
          WHEN 'coordinator' THEN 80
          WHEN 'doctor' THEN 70
          WHEN 'ipa' THEN 60
          WHEN 'nurse' THEN 50
          WHEN 'assistant' THEN 40
          WHEN 'viewer' THEN 10
          ELSE 0
        END >= CASE _required_role
          WHEN 'owner' THEN 100
          WHEN 'admin' THEN 90
          WHEN 'coordinator' THEN 80
          WHEN 'doctor' THEN 70
          WHEN 'ipa' THEN 60
          WHEN 'nurse' THEN 50
          WHEN 'assistant' THEN 40
          WHEN 'viewer' THEN 10
          ELSE 0
        END
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_site(_user_id UUID, _site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    JOIN public.sites s ON s.structure_id = om.structure_id
    WHERE om.user_id = _user_id
      AND s.id = _site_id
      AND om.is_active = true
      AND om.archived_at IS NULL
      AND s.is_active = true
      AND s.archived_at IS NULL
      AND (om.site_id IS NULL OR om.site_id = _site_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _structure_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND structure_id = _structure_id
      AND org_role IN ('owner', 'admin')
      AND is_active = true
      AND archived_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_healthcare_provider(_user_id UUID, _structure_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND structure_id = _structure_id
      AND org_role IN ('owner', 'admin', 'doctor', 'ipa', 'nurse', 'coordinator')
      AND is_active = true
      AND archived_at IS NULL
  )
$$;

-- -----------------------------------------------------------------------------
-- 5. RLS POLICIES POUR SITES
-- -----------------------------------------------------------------------------

CREATE POLICY "sites_select_members" ON public.sites
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), structure_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "sites_insert_admins" ON public.sites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), structure_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "sites_update_admins" ON public.sites
  FOR UPDATE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), structure_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "sites_delete_none" ON public.sites
  FOR DELETE TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 6. RLS POLICIES POUR ORG_MEMBERS
-- -----------------------------------------------------------------------------

CREATE POLICY "org_members_select" ON public.org_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_member(auth.uid(), structure_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "org_members_insert" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), structure_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "org_members_update" ON public.org_members
  FOR UPDATE TO authenticated
  USING (
    (public.is_org_admin(auth.uid(), structure_id) AND org_role != 'owner')
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "org_members_delete" ON public.org_members
  FOR DELETE TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 7. PROTECTION DU DERNIER OWNER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_count INTEGER;
BEGIN
  IF OLD.org_role = 'owner' AND (
    (NEW.is_active = false AND OLD.is_active = true) OR
    (NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL) OR
    (NEW.org_role != 'owner')
  ) THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.org_members
    WHERE structure_id = OLD.structure_id
      AND org_role = 'owner'
      AND is_active = true
      AND archived_at IS NULL
      AND id != OLD.id;
    
    IF v_owner_count = 0 THEN
      RAISE EXCEPTION 'ERREUR JURIDIQUE : Impossible de supprimer/désactiver le dernier propriétaire de la structure.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_protect_last_owner
  BEFORE UPDATE ON public.org_members
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_last_owner();

-- -----------------------------------------------------------------------------
-- 8. AUDIT AUTOMATIQUE DES MEMBRES
-- -----------------------------------------------------------------------------

CREATE TABLE public.org_members_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id UUID NOT NULL,
  structure_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_org_members_audit_member ON public.org_members_audit(org_member_id);
CREATE INDEX idx_org_members_audit_structure ON public.org_members_audit(structure_id);
CREATE INDEX idx_org_members_audit_changed_at ON public.org_members_audit(changed_at);

ALTER TABLE public.org_members_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_audit_select" ON public.org_members_audit
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(auth.uid(), structure_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.audit_org_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    INSERT INTO public.org_members_audit (
      org_member_id, structure_id, user_id, action, new_values, changed_by
    ) VALUES (
      NEW.id, NEW.structure_id, NEW.user_id, v_action,
      jsonb_build_object('org_role', NEW.org_role, 'site_id', NEW.site_id, 'is_active', NEW.is_active),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.org_role != NEW.org_role THEN
      v_action := 'role_changed';
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      v_action := 'deactivated';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      v_action := 'reactivated';
    ELSE
      v_action := 'updated';
    END IF;
    
    INSERT INTO public.org_members_audit (
      org_member_id, structure_id, user_id, action, old_values, new_values, changed_by
    ) VALUES (
      NEW.id, NEW.structure_id, NEW.user_id, v_action,
      jsonb_build_object('org_role', OLD.org_role, 'site_id', OLD.site_id, 'is_active', OLD.is_active),
      jsonb_build_object('org_role', NEW.org_role, 'site_id', NEW.site_id, 'is_active', NEW.is_active),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_audit_org_members
  AFTER INSERT OR UPDATE ON public.org_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_org_member_changes();

-- -----------------------------------------------------------------------------
-- 9. COLONNES MANQUANTES SUR STRUCTURES
-- -----------------------------------------------------------------------------

ALTER TABLE public.structures ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_structures_is_archived ON public.structures(is_archived) WHERE is_archived = false;

-- -----------------------------------------------------------------------------
-- 10. MIGRATION DES DONNÉES EXISTANTES
-- -----------------------------------------------------------------------------

INSERT INTO public.sites (structure_id, name, slug, address, phone, email, is_main)
SELECT 
  id,
  name,
  slug,
  address,
  phone,
  email,
  true
FROM public.structures
WHERE NOT EXISTS (
  SELECT 1 FROM public.sites WHERE sites.structure_id = structures.id
);

INSERT INTO public.org_members (user_id, structure_id, org_role, is_active)
SELECT 
  ur.user_id,
  ur.structure_id,
  CASE ur.role
    WHEN 'admin' THEN 'admin'::org_role
    WHEN 'practitioner' THEN 'doctor'::org_role
    WHEN 'ipa' THEN 'ipa'::org_role
    WHEN 'nurse' THEN 'nurse'::org_role
    WHEN 'assistant' THEN 'assistant'::org_role
    WHEN 'coordinator' THEN 'coordinator'::org_role
    ELSE 'viewer'::org_role
  END,
  ur.is_active
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_members om 
  WHERE om.user_id = ur.user_id AND om.structure_id = ur.structure_id
);

-- -----------------------------------------------------------------------------
-- 11. VUE PRATIQUE (sans avatar_url qui n'existe pas)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.org_members_with_details AS
SELECT 
  om.id,
  om.user_id,
  om.structure_id,
  om.site_id,
  om.org_role,
  om.is_active,
  om.invited_at,
  om.accepted_at,
  om.created_at,
  s.name AS structure_name,
  s.slug AS structure_slug,
  si.name AS site_name,
  p.first_name,
  p.last_name,
  tm.job_title,
  tm.specialty,
  tm.professional_id
FROM public.org_members om
JOIN public.structures s ON s.id = om.structure_id
LEFT JOIN public.sites si ON si.id = om.site_id
LEFT JOIN public.profiles p ON p.user_id = om.user_id
LEFT JOIN public.team_members tm ON tm.user_id = om.user_id AND tm.structure_id = om.structure_id;

-- -----------------------------------------------------------------------------
-- 12. MISE À JOUR get_user_structure_id
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_structure_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT structure_id 
  FROM public.org_members
  WHERE user_id = _user_id
    AND is_active = true
    AND archived_at IS NULL
  ORDER BY 
    CASE org_role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      ELSE 3
    END
  LIMIT 1
$$;

-- Commentaires
COMMENT ON TABLE public.sites IS 'Sites physiques (antennes) appartenant à une structure/MSP';
COMMENT ON TABLE public.org_members IS 'Membres des organisations avec leurs rôles et rattachements sites';
COMMENT ON TABLE public.org_members_audit IS 'Journal d''audit immutable des changements de membres';
COMMENT ON FUNCTION public.is_org_member IS 'Vérifie si un utilisateur est membre actif d''une structure';
COMMENT ON FUNCTION public.get_org_role IS 'Récupère le rôle organisationnel d''un utilisateur';
COMMENT ON FUNCTION public.has_org_role IS 'Vérifie si un utilisateur a un rôle >= au rôle requis';
COMMENT ON FUNCTION public.can_access_site IS 'Vérifie l''accès à un site spécifique';
COMMENT ON FUNCTION public.is_org_admin IS 'Vérifie si utilisateur est owner ou admin';
COMMENT ON FUNCTION public.is_healthcare_provider IS 'Vérifie si utilisateur est soignant';