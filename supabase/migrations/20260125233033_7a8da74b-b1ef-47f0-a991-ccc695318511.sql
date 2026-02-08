
-- Create a SECURITY DEFINER function to check structure membership without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_structure_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT structure_id 
  FROM public.org_members
  WHERE user_id = p_user_id
    AND is_active = true
    AND archived_at IS NULL;
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "org_members_select_same_structure" ON public.org_members;

-- Create a non-recursive SELECT policy using the SECURITY DEFINER function
CREATE POLICY "org_members_select_same_structure" ON public.org_members
FOR SELECT
USING (
  -- Structure must be in user's list of structures
  structure_id IN (SELECT get_user_structure_ids(auth.uid()))
);

-- Also fix the UPDATE policy to avoid recursion
DROP POLICY IF EXISTS "org_members_update_by_admin" ON public.org_members;

-- Create a helper function to check if user is admin of a structure
CREATE OR REPLACE FUNCTION public.is_structure_admin(p_user_id uuid, p_structure_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = p_user_id
      AND structure_id = p_structure_id
      AND org_role IN ('owner', 'admin')
      AND is_active = true
      AND archived_at IS NULL
  );
$$;

CREATE POLICY "org_members_update_by_admin" ON public.org_members
FOR UPDATE
USING (
  user_id = auth.uid()
  OR is_structure_admin(auth.uid(), structure_id)
);

-- Fix the DELETE policy to avoid recursion
DROP POLICY IF EXISTS "org_members_delete_by_admin" ON public.org_members;

CREATE POLICY "org_members_delete_by_admin" ON public.org_members
FOR DELETE
USING (
  is_structure_admin(auth.uid(), structure_id)
  AND org_role != 'owner'
);
