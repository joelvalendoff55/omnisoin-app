-- SPRINT 2 Part 2: Tables et fonctions RBAC

-- 1. Crée la table consultation_field_permissions
CREATE TABLE public.consultation_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  field_name text NOT NULL,
  role app_role NOT NULL,
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  is_medical_decision boolean DEFAULT false,
  requires_signature boolean DEFAULT false,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(table_name, field_name, role)
);

-- Index pour performance
CREATE INDEX idx_field_permissions_table_role ON public.consultation_field_permissions(table_name, role);
CREATE INDEX idx_field_permissions_field_role ON public.consultation_field_permissions(field_name, role);

-- RLS sur la table de permissions
ALTER TABLE public.consultation_field_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_permissions_select_authenticated"
ON public.consultation_field_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "field_permissions_modify_admin_only"
ON public.consultation_field_permissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- 2. Crée la table consultation_field_audit pour traçabilité
CREATE TABLE public.consultation_field_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  structure_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid NOT NULL,
  changed_by_role app_role NOT NULL,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  is_medical_decision boolean DEFAULT false,
  ip_address inet,
  user_agent text
);

-- Index pour performance
CREATE INDEX idx_field_audit_consultation ON public.consultation_field_audit(consultation_id);
CREATE INDEX idx_field_audit_changed_by ON public.consultation_field_audit(changed_by);
CREATE INDEX idx_field_audit_changed_at ON public.consultation_field_audit(changed_at DESC);
CREATE INDEX idx_field_audit_structure ON public.consultation_field_audit(structure_id);

-- RLS sur audit
ALTER TABLE public.consultation_field_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_audit_select_same_structure"
ON public.consultation_field_audit FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "field_audit_insert_same_structure"
ON public.consultation_field_audit FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "field_audit_no_update"
ON public.consultation_field_audit FOR UPDATE
USING (false);

CREATE POLICY "field_audit_no_delete"
ON public.consultation_field_audit FOR DELETE
USING (false);

-- 3. Fonction helper pour récupérer le rôle principal d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_primary_role(p_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'coordinator' THEN 2
      WHEN 'practitioner' THEN 3
      WHEN 'ipa' THEN 4
      WHEN 'nurse' THEN 5
      WHEN 'assistant' THEN 6
      ELSE 10
    END
  LIMIT 1;
$$;

-- 4. Fonction validate_field_access
CREATE OR REPLACE FUNCTION public.validate_field_access(
  p_user_id uuid,
  p_table_name text,
  p_field_name text,
  p_operation text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role app_role;
  v_has_permission boolean;
BEGIN
  v_user_role := get_user_primary_role(p_user_id);
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  SELECT 
    CASE p_operation
      WHEN 'read' THEN can_read
      WHEN 'write' THEN can_write
      WHEN 'approve' THEN can_approve
      ELSE false
    END
  INTO v_has_permission
  FROM consultation_field_permissions
  WHERE table_name = p_table_name
    AND field_name = p_field_name
    AND role = v_user_role;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- 5. Fonction pour vérifier si un champ est une décision médicale
CREATE OR REPLACE FUNCTION public.is_medical_decision_field(
  p_table_name text,
  p_field_name text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_medical_decision 
     FROM consultation_field_permissions 
     WHERE table_name = p_table_name 
       AND field_name = p_field_name 
       AND is_medical_decision = true
     LIMIT 1),
    false
  );
$$;

-- 6. Trigger pour auditer et valider les modifications de consultations
CREATE OR REPLACE FUNCTION public.enforce_consultation_field_permissions()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_user_role app_role;
  v_can_write boolean;
  v_is_medical boolean;
  v_structure_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_user_role := get_user_primary_role(v_user_id);
  v_structure_id := NEW.structure_id;
  
  -- Super admins peuvent tout modifier
  IF is_super_admin(v_user_id) THEN
    RETURN NEW;
  END IF;
  
  -- Si pas de permissions définies pour ce rôle, autoriser (fallback permissif)
  IF v_user_role IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Vérification du champ 'motif'
  IF OLD.motif IS DISTINCT FROM NEW.motif THEN
    SELECT can_write INTO v_can_write
    FROM consultation_field_permissions
    WHERE table_name = 'consultations' AND field_name = 'motif' AND role = v_user_role;
    
    -- Si permission explicitement définie et refusée
    IF v_can_write IS NOT NULL AND NOT v_can_write THEN
      RAISE EXCEPTION 'ERREUR RBAC: Rôle "%" non autorisé à modifier le champ "motif".', v_user_role;
    END IF;
    
    -- Logger si permission existe
    IF v_can_write IS NOT NULL THEN
      INSERT INTO consultation_field_audit (consultation_id, structure_id, field_name, old_value, new_value, changed_by, changed_by_role, is_medical_decision)
      VALUES (NEW.id, v_structure_id, 'motif', OLD.motif, NEW.motif, v_user_id, v_user_role, false);
    END IF;
  END IF;
  
  -- Vérification du champ 'examen_clinique'
  IF OLD.examen_clinique IS DISTINCT FROM NEW.examen_clinique THEN
    SELECT can_write INTO v_can_write
    FROM consultation_field_permissions
    WHERE table_name = 'consultations' AND field_name = 'examen_clinique' AND role = v_user_role;
    
    IF v_can_write IS NOT NULL AND NOT v_can_write THEN
      RAISE EXCEPTION 'ERREUR RBAC: Rôle "%" non autorisé à modifier le champ "examen_clinique".', v_user_role;
    END IF;
    
    IF v_can_write IS NOT NULL THEN
      INSERT INTO consultation_field_audit (consultation_id, structure_id, field_name, old_value, new_value, changed_by, changed_by_role, is_medical_decision)
      VALUES (NEW.id, v_structure_id, 'examen_clinique', OLD.examen_clinique, NEW.examen_clinique, v_user_id, v_user_role, false);
    END IF;
  END IF;
  
  -- Vérification du champ 'notes_cliniques'
  IF OLD.notes_cliniques IS DISTINCT FROM NEW.notes_cliniques THEN
    SELECT can_write INTO v_can_write
    FROM consultation_field_permissions
    WHERE table_name = 'consultations' AND field_name = 'notes_cliniques' AND role = v_user_role;
    
    IF v_can_write IS NOT NULL AND NOT v_can_write THEN
      RAISE EXCEPTION 'ERREUR RBAC: Rôle "%" non autorisé à modifier le champ "notes_cliniques".', v_user_role;
    END IF;
    
    IF v_can_write IS NOT NULL THEN
      INSERT INTO consultation_field_audit (consultation_id, structure_id, field_name, old_value, new_value, changed_by, changed_by_role, is_medical_decision)
      VALUES (NEW.id, v_structure_id, 'notes_cliniques', OLD.notes_cliniques, NEW.notes_cliniques, v_user_id, v_user_role, false);
    END IF;
  END IF;
  
  -- Vérification du champ 'conclusion' (DÉCISION MÉDICALE)
  IF OLD.conclusion IS DISTINCT FROM NEW.conclusion THEN
    SELECT can_write, is_medical_decision INTO v_can_write, v_is_medical
    FROM consultation_field_permissions
    WHERE table_name = 'consultations' AND field_name = 'conclusion' AND role = v_user_role;
    
    -- Si c'est une décision médicale, vérifier le rôle
    IF v_is_medical IS NOT NULL AND v_is_medical AND v_user_role NOT IN ('practitioner', 'admin') THEN
      RAISE EXCEPTION 'ERREUR JURIDIQUE: Seul un médecin peut modifier la conclusion médicale. Rôle actuel: %. Exercice illégal de la médecine.', v_user_role;
    END IF;
    
    IF v_can_write IS NOT NULL AND NOT v_can_write THEN
      RAISE EXCEPTION 'ERREUR RBAC: Rôle "%" non autorisé à modifier le champ "conclusion".', v_user_role;
    END IF;
    
    IF v_can_write IS NOT NULL THEN
      INSERT INTO consultation_field_audit (consultation_id, structure_id, field_name, old_value, new_value, changed_by, changed_by_role, is_medical_decision)
      VALUES (NEW.id, v_structure_id, 'conclusion', OLD.conclusion, NEW.conclusion, v_user_id, v_user_role, COALESCE(v_is_medical, true));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_enforce_consultation_permissions
BEFORE UPDATE ON public.consultations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_consultation_field_permissions();

-- 7. Fonction pour obtenir les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_field_permissions(
  p_user_id uuid,
  p_table_name text
)
RETURNS TABLE (
  field_name text,
  can_read boolean,
  can_write boolean,
  can_approve boolean,
  is_medical_decision boolean,
  requires_signature boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cfp.field_name,
    cfp.can_read,
    cfp.can_write,
    cfp.can_approve,
    cfp.is_medical_decision,
    cfp.requires_signature
  FROM consultation_field_permissions cfp
  WHERE cfp.table_name = p_table_name
    AND cfp.role = get_user_primary_role(p_user_id);
$$;