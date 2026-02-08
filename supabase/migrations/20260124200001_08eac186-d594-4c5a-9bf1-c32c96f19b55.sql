-- Enable pgcrypto extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- STEP 1: Hash all existing plaintext access codes
-- =====================================================
-- This converts all existing access codes to bcrypt hashes
UPDATE public.patient_accounts 
SET access_code = crypt(access_code, gen_salt('bf', 10))
WHERE access_code NOT LIKE '$2a$%' AND access_code NOT LIKE '$2b$%';

-- =====================================================
-- STEP 2: Update verify_patient_access function to use bcrypt
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_patient_access(
  _email TEXT,
  _access_code TEXT
)
RETURNS TABLE (
  patient_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Find matching patient account using bcrypt verification
  -- crypt(_access_code, pa.access_code) hashes the input using the stored salt
  -- and compares with the stored hash
  RETURN QUERY
  SELECT 
    pa.patient_id,
    p.first_name,
    p.last_name,
    pa.email
  FROM public.patient_accounts pa
  JOIN public.patients p ON p.id = pa.patient_id
  WHERE LOWER(pa.email) = LOWER(_email)
    AND pa.access_code = crypt(_access_code, pa.access_code)
    AND pa.is_active = true;
  
  -- Get the patient_id for updating last_login
  SELECT pa.patient_id INTO v_patient_id
  FROM public.patient_accounts pa
  WHERE LOWER(pa.email) = LOWER(_email)
    AND pa.access_code = crypt(_access_code, pa.access_code)
    AND pa.is_active = true;
  
  -- Update last_login if found
  IF v_patient_id IS NOT NULL THEN
    UPDATE public.patient_accounts
    SET last_login = now()
    WHERE patient_id = v_patient_id;
  END IF;
END;
$$;

-- =====================================================
-- STEP 3: Create function to hash new access codes on insert/update
-- =====================================================
CREATE OR REPLACE FUNCTION public.hash_patient_access_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if it's not already a bcrypt hash
  IF NEW.access_code IS NOT NULL 
     AND NEW.access_code NOT LIKE '$2a$%' 
     AND NEW.access_code NOT LIKE '$2b$%' THEN
    NEW.access_code := crypt(NEW.access_code, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-hash access codes
DROP TRIGGER IF EXISTS hash_patient_access_code_trigger ON public.patient_accounts;
CREATE TRIGGER hash_patient_access_code_trigger
  BEFORE INSERT OR UPDATE OF access_code ON public.patient_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_patient_access_code();

-- =====================================================
-- STEP 4: Restrict RLS policies to admin/coordinator only
-- =====================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Practitioners can view patient accounts in their structure" ON public.patient_accounts;
DROP POLICY IF EXISTS "Practitioners can create patient accounts in their structure" ON public.patient_accounts;
DROP POLICY IF EXISTS "Practitioners can update patient accounts in their structure" ON public.patient_accounts;

-- Create restricted policies for admin/coordinator only
CREATE POLICY "Admin coordinator can view patient accounts"
  ON public.patient_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'coordinator')
        AND om.is_active = true
        AND om.archived_at IS NULL
    )
  );

CREATE POLICY "Admin coordinator can create patient accounts"
  ON public.patient_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'coordinator')
        AND om.is_active = true
        AND om.archived_at IS NULL
    )
  );

CREATE POLICY "Admin coordinator can update patient accounts"
  ON public.patient_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'coordinator')
        AND om.is_active = true
        AND om.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'coordinator')
        AND om.is_active = true
        AND om.archived_at IS NULL
    )
  );

CREATE POLICY "Admin coordinator can delete patient accounts"
  ON public.patient_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.org_members om ON om.structure_id = p.structure_id
      WHERE p.id = patient_accounts.patient_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'coordinator')
        AND om.is_active = true
        AND om.archived_at IS NULL
    )
  );

-- =====================================================
-- STEP 5: Add comment for documentation
-- =====================================================
COMMENT ON COLUMN public.patient_accounts.access_code IS 'Bcrypt hashed access code - never store plaintext';