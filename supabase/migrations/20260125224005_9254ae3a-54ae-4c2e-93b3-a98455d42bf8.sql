
-- Fix RLS policies to break circular dependencies

-- 1. Fix org_members SELECT policy - add simple self-visibility first
DROP POLICY IF EXISTS "org_members_select" ON public.org_members;

-- Create simple self-visibility policy (no function calls)
CREATE POLICY "org_members_select_own"
ON public.org_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create secondary policy for viewing colleagues (uses SECURITY DEFINER function)
CREATE POLICY "org_members_select_colleagues"
ON public.org_members
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), structure_id) OR is_super_admin(auth.uid()));

-- 2. Also ensure user_roles has a simple self-access policy that works
-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles of colleagues" ON public.user_roles;

-- Simple self-visibility (this should always work)
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Colleagues visibility via org_members
CREATE POLICY "user_roles_select_colleagues"  
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = user_roles.structure_id
      AND om.is_active = true
  )
);
