-- Function to create structure and assign admin role during signup
-- Called from the signup form, not via trigger (to allow optional structure creation)

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
  -- Generate slug from name if not provided
  _final_slug := COALESCE(
    _structure_slug, 
    lower(regexp_replace(_structure_name, '[^a-zA-Z0-9]+', '-', 'g'))
  );
  
  -- Ensure slug is unique by appending random suffix if needed
  IF EXISTS (SELECT 1 FROM structures WHERE slug = _final_slug) THEN
    _final_slug := _final_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  -- Create the structure
  INSERT INTO public.structures (name, slug, country, timezone, is_active)
  VALUES (_structure_name, _final_slug, 'FR', 'Europe/Paris', true)
  RETURNING id INTO _new_structure_id;

  -- Assign admin role to the user for this structure
  INSERT INTO public.user_roles (user_id, structure_id, role, is_active)
  VALUES (_user_id, _new_structure_id, 'admin', true);

  -- Update user profile with structure_id
  UPDATE public.profiles
  SET structure_id = _new_structure_id, updated_at = now()
  WHERE user_id = _user_id;

  RETURN _new_structure_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_structure_with_admin(UUID, TEXT, TEXT) TO authenticated;

-- Function to join an existing structure (first user becomes admin if no admin exists)
CREATE OR REPLACE FUNCTION public.join_structure_with_code(
  _user_id UUID,
  _structure_slug TEXT,
  _default_role app_role DEFAULT 'assistant'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _structure_id UUID;
  _has_admin BOOLEAN;
  _assigned_role app_role;
BEGIN
  -- Find structure by slug
  SELECT id INTO _structure_id
  FROM structures
  WHERE slug = _structure_slug AND is_active = true;

  IF _structure_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Structure introuvable');
  END IF;

  -- Check if user already belongs to this structure
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND structure_id = _structure_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous appartenez déjà à cette structure');
  END IF;

  -- Check if structure has any admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE structure_id = _structure_id AND role = 'admin' AND is_active = true
  ) INTO _has_admin;

  -- Assign admin if no admin exists, otherwise use default role
  _assigned_role := CASE WHEN NOT _has_admin THEN 'admin' ELSE _default_role END;

  -- Create the role assignment
  INSERT INTO public.user_roles (user_id, structure_id, role, is_active)
  VALUES (_user_id, _structure_id, _assigned_role, true);

  -- Update user profile with structure_id
  UPDATE public.profiles
  SET structure_id = _structure_id, updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'structure_id', _structure_id,
    'role', _assigned_role,
    'is_first_admin', NOT _has_admin
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_structure_with_code(UUID, TEXT, app_role) TO authenticated;