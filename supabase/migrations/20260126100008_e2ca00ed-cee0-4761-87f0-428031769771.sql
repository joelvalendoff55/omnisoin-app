-- Fix create_structure_with_admin to insert into org_members (source of truth)
-- This ensures practitioners who CREATE a structure appear in org_members

CREATE OR REPLACE FUNCTION public.create_structure_with_admin(
  _user_id UUID,
  _structure_name TEXT,
  _structure_slug TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_structure_id UUID;
  _final_slug TEXT;
BEGIN
  -- Generate slug if not provided
  IF _structure_slug IS NULL OR _structure_slug = '' THEN
    _final_slug := lower(regexp_replace(_structure_name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Add random suffix to ensure uniqueness
    _final_slug := _final_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  ELSE
    _final_slug := lower(_structure_slug);
  END IF;

  -- Create the structure
  INSERT INTO public.structures (name, slug, country, timezone, is_active)
  VALUES (_structure_name, _final_slug, 'FR', 'Europe/Paris', true)
  RETURNING id INTO _new_structure_id;

  -- Insert into org_members (SOURCE OF TRUTH for structure membership)
  INSERT INTO public.org_members (user_id, structure_id, org_role, is_active, accepted_at)
  VALUES (_user_id, _new_structure_id, 'admin', true, now());

  -- Also insert into user_roles for backward compatibility
  INSERT INTO public.user_roles (user_id, structure_id, role, is_active)
  VALUES (_user_id, _new_structure_id, 'admin', true)
  ON CONFLICT (user_id, structure_id, role) DO NOTHING;

  -- Update user profile with structure_id (legacy support)
  UPDATE public.profiles
  SET structure_id = _new_structure_id, updated_at = now()
  WHERE user_id = _user_id;

  RETURN _new_structure_id;
END;
$$;