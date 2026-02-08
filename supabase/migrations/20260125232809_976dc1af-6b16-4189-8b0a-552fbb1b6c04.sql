
-- Drop the restrictive policy that only shows own records
DROP POLICY IF EXISTS "org_members_select_own" ON public.org_members;

-- Create a new policy that allows viewing all members of the same structure
CREATE POLICY "org_members_select_same_structure" ON public.org_members
FOR SELECT
USING (
  -- User can see their own record
  user_id = auth.uid()
  OR
  -- User can see other members if they belong to the same structure
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = org_members.structure_id
      AND om.is_active = true
      AND om.archived_at IS NULL
  )
);

-- Also update the update policy to allow admins to update other members
DROP POLICY IF EXISTS "org_members_update_own" ON public.org_members;

-- Admins can update any member in their structure
CREATE POLICY "org_members_update_by_admin" ON public.org_members
FOR UPDATE
USING (
  -- Own record
  user_id = auth.uid()
  OR
  -- Admin of the same structure can update
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = org_members.structure_id
      AND om.org_role IN ('owner', 'admin')
      AND om.is_active = true
      AND om.archived_at IS NULL
  )
);

-- Add delete policy for admins
DROP POLICY IF EXISTS "org_members_delete_by_admin" ON public.org_members;

CREATE POLICY "org_members_delete_by_admin" ON public.org_members
FOR DELETE
USING (
  -- Admin of the same structure can delete (except owners)
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = org_members.structure_id
      AND om.org_role IN ('owner', 'admin')
      AND om.is_active = true
      AND om.archived_at IS NULL
  )
  AND org_members.org_role != 'owner'
);
