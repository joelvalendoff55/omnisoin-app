
-- Supprimer toutes les policies actuelles sur org_members
DROP POLICY IF EXISTS "org_members_admin_insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_admin_select_all" ON public.org_members;
DROP POLICY IF EXISTS "org_members_admin_update" ON public.org_members;
DROP POLICY IF EXISTS "org_members_self_select" ON public.org_members;

-- Policy ultra-simple: chaque utilisateur peut voir ses propres lignes
CREATE POLICY "org_members_select_own"
ON public.org_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy pour insertion: ne devrait être utilisée que par admin via service role
-- Ici on permet l'insertion mais elle sera restreinte par d'autres mécanismes
CREATE POLICY "org_members_insert"
ON public.org_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy pour update: ne devrait être utilisée que par admin via service role
CREATE POLICY "org_members_update_own"
ON public.org_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
