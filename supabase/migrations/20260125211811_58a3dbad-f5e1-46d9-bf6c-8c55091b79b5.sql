-- ============================================
-- FIX 1: Secure Patient Portal Functions
-- Drop existing functions first, then recreate with access control
-- ============================================

-- Drop existing functions with their specific signatures
DROP FUNCTION IF EXISTS public.get_patient_messages(uuid);
DROP FUNCTION IF EXISTS public.get_patient_documents(uuid);
DROP FUNCTION IF EXISTS public.get_patient_appointments(uuid);
DROP FUNCTION IF EXISTS public.get_patient_info(uuid);

-- Recreate get_patient_messages with access control
CREATE FUNCTION public.get_patient_messages(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  is_from_patient BOOLEAN,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  practitioner_name TEXT,
  subject TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_patient_id UUID;
BEGIN
  -- Get the patient_id associated with the current authenticated user via patient_accounts
  SELECT pa.patient_id INTO v_requesting_patient_id
  FROM patient_accounts pa
  WHERE pa.user_id = auth.uid() 
  AND pa.is_active = true;
  
  -- If no patient account found, deny access
  IF v_requesting_patient_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No active patient account for current user';
  END IF;
  
  -- Verify the requesting patient can only access their own data
  IF v_requesting_patient_id != _patient_id THEN
    RAISE EXCEPTION 'Access denied: Can only view own messages';
  END IF;

  RETURN QUERY
  SELECT 
    pm.id,
    pm.content,
    CASE WHEN pm.direction = 'patient_to_practitioner' THEN true ELSE false END as is_from_patient,
    pm.is_read,
    pm.created_at,
    COALESCE(p.full_name, 'Équipe soignante') as practitioner_name,
    pm.subject
  FROM patient_messages pm
  LEFT JOIN profiles p ON pm.practitioner_id = p.id
  WHERE pm.patient_id = _patient_id
  ORDER BY pm.created_at DESC;
END;
$$;

-- Recreate get_patient_documents with access control
CREATE FUNCTION public.get_patient_documents(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ,
  source TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_patient_id UUID;
BEGIN
  -- Get the patient_id associated with the current authenticated user via patient_accounts
  SELECT pa.patient_id INTO v_requesting_patient_id
  FROM patient_accounts pa
  WHERE pa.user_id = auth.uid() 
  AND pa.is_active = true;
  
  -- If no patient account found, deny access
  IF v_requesting_patient_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No active patient account for current user';
  END IF;
  
  -- Verify the requesting patient can only access their own data
  IF v_requesting_patient_id != _patient_id THEN
    RAISE EXCEPTION 'Access denied: Can only view own documents';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.description,
    d.file_path,
    d.file_type,
    d.file_size,
    d.created_at,
    d.source,
    d.status
  FROM documents d
  WHERE d.patient_id = _patient_id
  AND (d.status IS NULL OR d.status = 'active')
  ORDER BY d.created_at DESC;
END;
$$;

-- Recreate get_patient_appointments with access control
CREATE FUNCTION public.get_patient_appointments(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT,
  location TEXT,
  practitioner_name TEXT,
  appointment_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_patient_id UUID;
BEGIN
  -- Get the patient_id associated with the current authenticated user via patient_accounts
  SELECT pa.patient_id INTO v_requesting_patient_id
  FROM patient_accounts pa
  WHERE pa.user_id = auth.uid() 
  AND pa.is_active = true;
  
  -- If no patient account found, deny access
  IF v_requesting_patient_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No active patient account for current user';
  END IF;
  
  -- Verify the requesting patient can only access their own data
  IF v_requesting_patient_id != _patient_id THEN
    RAISE EXCEPTION 'Access denied: Can only view own appointments';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.description,
    a.start_time,
    a.end_time,
    a.status,
    a.location,
    COALESCE(p.full_name, 'Praticien') as practitioner_name,
    a.appointment_type
  FROM appointments a
  LEFT JOIN team_members tm ON a.practitioner_id = tm.id
  LEFT JOIN profiles p ON tm.user_id = p.user_id
  WHERE a.patient_id = _patient_id
  ORDER BY a.start_time DESC;
END;
$$;

-- Recreate get_patient_info with access control
CREATE FUNCTION public.get_patient_info(_patient_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  dob DATE,
  sex TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_patient_id UUID;
BEGIN
  -- Get the patient_id associated with the current authenticated user via patient_accounts
  SELECT pa.patient_id INTO v_requesting_patient_id
  FROM patient_accounts pa
  WHERE pa.user_id = auth.uid() 
  AND pa.is_active = true;
  
  -- If no patient account found, deny access
  IF v_requesting_patient_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No active patient account for current user';
  END IF;
  
  -- Verify the requesting patient can only access their own data
  IF v_requesting_patient_id != _patient_id THEN
    RAISE EXCEPTION 'Access denied: Can only view own information';
  END IF;

  RETURN QUERY
  SELECT 
    pt.id,
    pt.first_name,
    pt.last_name,
    pt.email,
    pt.phone,
    pt.dob,
    pt.sex
  FROM patients pt
  WHERE pt.id = _patient_id;
END;
$$;

-- ============================================
-- FIX 2: Secure Profiles Table
-- Replace overly permissive policy with structure-based access
-- ============================================

-- Drop existing policies on profiles that may be too permissive
DROP POLICY IF EXISTS "profiles_select_restricted" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow viewing public profiles" ON public.profiles;

-- Create/replace secure function to check if user can access profile
CREATE OR REPLACE FUNCTION public.can_access_profile_secure(_profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_structure_id UUID;
  v_target_structure_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Users can always see their own profile
  IF v_current_user_id = _profile_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get current user's structure
  SELECT structure_id INTO v_current_structure_id
  FROM profiles
  WHERE user_id = v_current_user_id;
  
  -- Get target user's structure
  SELECT structure_id INTO v_target_structure_id
  FROM profiles
  WHERE user_id = _profile_user_id;
  
  -- Only allow access within same structure
  IF v_current_structure_id IS NOT NULL 
     AND v_target_structure_id IS NOT NULL 
     AND v_current_structure_id = v_target_structure_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create new restricted policy for profiles
CREATE POLICY "profiles_select_same_structure"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.can_access_profile_secure(user_id));

-- Ensure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;