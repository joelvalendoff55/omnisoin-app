-- First create the helper function for profiles access
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is viewing their own profile
    profile_user_id = auth.uid()
    OR
    -- User is admin or coordinator in any shared structure
    EXISTS (
      SELECT 1 
      FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.structure_id = ur2.structure_id
      WHERE ur1.user_id = auth.uid()
        AND ur2.user_id = profile_user_id
        AND ur1.role IN ('admin', 'coordinator')
        AND ur1.is_active = true
        AND ur2.is_active = true
    )
$$;

-- Now recreate the policy
DROP POLICY IF EXISTS "profiles_select_restricted" ON public.profiles;

CREATE POLICY "profiles_select_restricted"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.can_access_profile(id)
);