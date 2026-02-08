-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create super_admins table for cross-structure super admin access
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- RLS policies for super_admins table
CREATE POLICY "Super admins can view super_admins"
ON public.super_admins
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super_admins"
ON public.super_admins
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add slug and is_active columns to system_prompts if not exists
ALTER TABLE public.system_prompts 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing prompts to have slugs based on name
UPDATE public.system_prompts 
SET slug = LOWER(REPLACE(name, ' ', '_'))
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.system_prompts 
ALTER COLUMN slug SET NOT NULL;

-- Update system_prompts RLS to also allow super_admins
DROP POLICY IF EXISTS "Prompt admins can view prompts" ON public.system_prompts;
DROP POLICY IF EXISTS "Prompt admins can insert prompts" ON public.system_prompts;
DROP POLICY IF EXISTS "Prompt admins can update prompts" ON public.system_prompts;
DROP POLICY IF EXISTS "Prompt admins can delete prompts" ON public.system_prompts;

CREATE POLICY "Authorized users can view prompts"
ON public.system_prompts
FOR SELECT
USING (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can insert prompts"
ON public.system_prompts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can update prompts"
ON public.system_prompts
FOR UPDATE
USING (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can delete prompts"
ON public.system_prompts
FOR DELETE
USING (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

-- Also update prompt_versions RLS
DROP POLICY IF EXISTS "Prompt admins can view versions" ON public.prompt_versions;
DROP POLICY IF EXISTS "Prompt admins can insert versions" ON public.prompt_versions;
DROP POLICY IF EXISTS "Prompt admins can update versions" ON public.prompt_versions;
DROP POLICY IF EXISTS "Prompt admins can delete versions" ON public.prompt_versions;

CREATE POLICY "Authorized users can view versions"
ON public.prompt_versions
FOR SELECT
USING (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can insert versions"
ON public.prompt_versions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can update versions"
ON public.prompt_versions
FOR UPDATE
USING (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can delete versions"
ON public.prompt_versions
FOR DELETE
USING (
  has_role(auth.uid(), 'prompt_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

-- Allow super admins to view all structures
DROP POLICY IF EXISTS "Users can view their own structure" ON public.structures;

CREATE POLICY "Users can view structures"
ON public.structures
FOR SELECT
USING (
  id = get_user_structure_id(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

-- Allow super admins to view all activity logs
DROP POLICY IF EXISTS "Users can view logs in their structure" ON public.activity_logs;

CREATE POLICY "Users can view activity logs"
ON public.activity_logs
FOR SELECT
USING (
  structure_id = get_user_structure_id(auth.uid())
  OR is_super_admin(auth.uid())
);