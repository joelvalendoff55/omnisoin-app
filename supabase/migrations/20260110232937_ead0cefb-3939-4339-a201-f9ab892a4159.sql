-- =============================================
-- SPRINT 0: OmniSoin Assist - Auth + Multi-tenant
-- =============================================

-- 1) Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'prompt_admin', 'practitioner', 'assistant', 'coordinator');

-- 2) Create structures table (multi-tenant root)
CREATE TABLE public.structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    country TEXT DEFAULT 'FR',
    timezone TEXT DEFAULT 'Europe/Paris',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

-- Enable RLS on structures
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- 3) Create user_roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    structure_id UUID REFERENCES public.structures(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, structure_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Add structure_id to profiles (link users to structures)
ALTER TABLE public.profiles 
ADD COLUMN structure_id UUID REFERENCES public.structures(id) ON DELETE SET NULL;

-- 5) Security Definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- 6) Function to get user's structure_id
CREATE OR REPLACE FUNCTION public.get_user_structure_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT structure_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 7) Function to check if user belongs to a structure
CREATE OR REPLACE FUNCTION public.user_belongs_to_structure(_user_id UUID, _structure_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND structure_id = _structure_id
  )
$$;

-- 8) RLS Policies for structures
CREATE POLICY "Users can view their own structure"
ON public.structures
FOR SELECT
TO authenticated
USING (
  id = public.get_user_structure_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update their structure"
ON public.structures
FOR UPDATE
TO authenticated
USING (
  id = public.get_user_structure_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

-- 9) RLS Policies for user_roles
CREATE POLICY "Users can view roles in their structure"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  structure_id = public.get_user_structure_id(auth.uid())
);

CREATE POLICY "Admins can manage roles in their structure"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  structure_id = public.get_user_structure_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  structure_id = public.get_user_structure_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

-- 10) Update profiles RLS to be structure-aware
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their structure"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR structure_id = public.get_user_structure_id(auth.uid())
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 11) Timestamp trigger for new tables
CREATE TRIGGER update_structures_updated_at
BEFORE UPDATE ON public.structures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();