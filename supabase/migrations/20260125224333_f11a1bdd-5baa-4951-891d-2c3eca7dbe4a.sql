
-- Supprimer la policy récursive problématique sur user_roles
DROP POLICY IF EXISTS "Admins can manage roles in their structure" ON public.user_roles;

-- Recréer une policy admin sans récursion
-- Les admins peuvent gérer les rôles de leur structure via org_members
CREATE POLICY "user_roles_admin_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = user_roles.structure_id
      AND om.org_role IN ('admin', 'owner')
      AND om.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = user_roles.structure_id
      AND om.org_role IN ('admin', 'owner')
      AND om.is_active = true
  )
);
