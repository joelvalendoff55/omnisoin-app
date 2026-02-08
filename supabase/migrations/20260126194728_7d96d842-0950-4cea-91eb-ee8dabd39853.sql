-- Drop the overly restrictive SELECT policy on patients
DROP POLICY IF EXISTS "Users can view patients in their structure" ON public.patients;

-- The patients_strict_access policy already allows all active org_members to see patients
-- So we don't need the first policy at all

-- Create a simpler combined policy that allows viewing for all structure members
DROP POLICY IF EXISTS "patients_strict_access" ON public.patients;

CREATE POLICY "patients_structure_members_can_view" 
ON public.patients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.structure_id = patients.structure_id
      AND om.is_active = true
  )
);