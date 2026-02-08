-- Enable RLS on structures table
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is an organization owner (can see all structures)
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

-- Policy: Owners can view all structures (for super admin dashboard)
CREATE POLICY "Organization owners can view all structures"
ON public.structures
FOR SELECT
TO authenticated
USING (public.is_org_owner(auth.uid()));

-- Policy: Users can view their own structure
CREATE POLICY "Users can view their own structure"
ON public.structures
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT structure_id 
    FROM public.org_members 
    WHERE user_id = auth.uid() 
      AND is_active = true 
      AND archived_at IS NULL
  )
);