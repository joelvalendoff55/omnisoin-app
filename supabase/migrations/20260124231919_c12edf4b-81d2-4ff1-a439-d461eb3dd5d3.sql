-- Fix security warnings: Restrict public access to system configuration tables

-- 1. Fix complementary_exams: Replace public read policy with authenticated-only policy
DROP POLICY IF EXISTS "Anyone can view active exams" ON public.complementary_exams;

CREATE POLICY "Authenticated users can view active exams"
ON public.complementary_exams
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Fix role_action_permissions: Replace public read with admin/coordinator-only access
DROP POLICY IF EXISTS "role_action_permissions_select" ON public.role_action_permissions;

CREATE POLICY "role_action_permissions_select_admin_coordinator"
ON public.role_action_permissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordinator'::app_role)
);

-- 3. Fix documents storage bucket RLS policies to use structure_id instead of user_id
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view documents in their structure" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documents" ON storage.objects;

-- Create new structure-based policies for documents bucket
CREATE POLICY "Structure members can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT structure_id::text 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Structure members can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT structure_id::text 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Structure members can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT structure_id::text 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT structure_id::text 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
  )
);