-- Create or replace function to check if user is an org owner (super admin)
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id
      AND org_role = 'owner'
      AND is_active = true
      AND archived_at IS NULL
  )
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view structures" ON public.structures;

-- Create new policy that allows owners to see ALL structures
CREATE POLICY "Users can view structures"
ON public.structures
FOR SELECT
TO public
USING (
  -- Users can see their own structure
  id = get_user_structure_id(auth.uid())
  -- Admins can see their own structure
  OR has_role(auth.uid(), 'admin'::app_role)
  -- Legacy super admin check
  OR is_super_admin(auth.uid())
  -- Org owners (super admins) can see ALL structures
  OR is_org_owner(auth.uid())
);