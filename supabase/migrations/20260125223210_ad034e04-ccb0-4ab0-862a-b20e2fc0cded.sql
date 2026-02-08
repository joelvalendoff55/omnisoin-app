
-- Fix RLS policy on user_roles to allow users to read their own roles
-- The current policy creates a circular dependency issue

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view roles in their structure" ON public.user_roles;

-- Create a simpler policy that allows users to see their own roles
-- This avoids the circular dependency where we need structure_id to get structure_id
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Also allow users in the same structure to see each other's roles
-- (using SECURITY DEFINER function to avoid recursion)
CREATE POLICY "Users can view roles of colleagues"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = user_roles.structure_id
      AND om.is_active = true
      AND om.archived_at IS NULL
  )
);
