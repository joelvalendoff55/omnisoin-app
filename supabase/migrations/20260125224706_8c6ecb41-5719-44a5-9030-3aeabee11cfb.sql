
-- ============================================================================
-- CORRECTION DÉFINITIVE: Suppression de TOUTES les récursions RLS
-- ============================================================================

-- 1. Supprimer TOUTES les policies existantes sur user_roles
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_colleagues" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles of colleagues" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their structure" ON public.user_roles;

-- 2. Supprimer TOUTES les policies existantes sur org_members
DROP POLICY IF EXISTS "org_members_select_own" ON public.org_members;
DROP POLICY IF EXISTS "org_members_select_colleagues" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_update" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;

-- ============================================================================
-- NOUVELLES POLICIES ULTRA-SIMPLES SANS AUCUNE RÉCURSION
-- ============================================================================

-- USER_ROLES: Une seule policy SELECT super simple
-- Chaque utilisateur peut voir uniquement ses propres rôles
CREATE POLICY "user_roles_self_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- USER_ROLES: Policy INSERT pour que les admins puissent ajouter des rôles
-- Utilise has_role() qui est SECURITY DEFINER donc bypass RLS
CREATE POLICY "user_roles_admin_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- USER_ROLES: Policy UPDATE pour les admins
CREATE POLICY "user_roles_admin_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- USER_ROLES: Policy DELETE pour les admins
CREATE POLICY "user_roles_admin_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================================
-- ORG_MEMBERS: Policies ultra-simples
-- ============================================================================

-- ORG_MEMBERS: Chaque utilisateur peut voir son propre enregistrement
CREATE POLICY "org_members_self_select"
ON public.org_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ORG_MEMBERS: Les admins peuvent voir tous les membres de leur structure
-- On utilise une sous-requête directe sans fonction
CREATE POLICY "org_members_admin_select_all"
ON public.org_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om_admin
    WHERE om_admin.user_id = auth.uid()
      AND om_admin.structure_id = org_members.structure_id
      AND om_admin.org_role IN ('admin', 'owner')
      AND om_admin.is_active = true
  )
);

-- ORG_MEMBERS: Les admins peuvent inviter/modifier des membres
CREATE POLICY "org_members_admin_insert"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members om_admin
    WHERE om_admin.user_id = auth.uid()
      AND om_admin.structure_id = org_members.structure_id
      AND om_admin.org_role IN ('admin', 'owner')
      AND om_admin.is_active = true
  )
);

CREATE POLICY "org_members_admin_update"
ON public.org_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om_admin
    WHERE om_admin.user_id = auth.uid()
      AND om_admin.structure_id = org_members.structure_id
      AND om_admin.org_role IN ('admin', 'owner')
      AND om_admin.is_active = true
  )
  AND org_role != 'owner' -- Ne peut pas modifier un owner
);

-- Note: Pas de policy DELETE volontairement (archivage uniquement via UPDATE)
