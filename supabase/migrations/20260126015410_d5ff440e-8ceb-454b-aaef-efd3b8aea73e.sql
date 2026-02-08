-- Create a new function to get all admins from org_members for super admin view
CREATE OR REPLACE FUNCTION public.get_all_org_admins()
RETURNS TABLE(
  member_id uuid,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  structure_id uuid,
  structure_name text,
  org_role text,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is an owner in any structure (platform-level super admin)
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.user_id = auth.uid()
      AND org_members.org_role = 'owner'
      AND org_members.is_active = true
      AND org_members.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not authorized - owner role required';
  END IF;

  RETURN QUERY
  SELECT 
    om.id as member_id,
    om.user_id,
    COALESCE(u.email, 'email@unknown.com') as email,
    p.first_name,
    p.last_name,
    om.structure_id,
    s.name as structure_name,
    om.org_role::text,
    om.is_active,
    om.created_at,
    om.updated_at
  FROM public.org_members om
  LEFT JOIN public.profiles p ON om.user_id = p.user_id
  LEFT JOIN public.structures s ON om.structure_id = s.id
  LEFT JOIN auth.users u ON om.user_id = u.id
  WHERE om.org_role IN ('owner', 'admin')
    AND om.archived_at IS NULL
  ORDER BY s.name ASC, om.org_role DESC, om.created_at DESC;
END;
$$;