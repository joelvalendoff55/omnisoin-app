-- Create default testing structure
INSERT INTO public.structures (id, name, slug, country, timezone, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Structure Test',
  'structure-test',
  'FR',
  'Europe/Paris',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Update joel's profile with structure_id
UPDATE public.profiles 
SET structure_id = 'a0000000-0000-0000-0000-000000000001',
    updated_at = now()
WHERE user_id = 'df5f5e60-a62e-4861-a54a-cbb280f6b1b5';

-- Grant joel admin role for this structure
INSERT INTO public.user_roles (user_id, structure_id, role, is_active)
VALUES (
  'df5f5e60-a62e-4861-a54a-cbb280f6b1b5',
  'a0000000-0000-0000-0000-000000000001',
  'admin',
  true
)
ON CONFLICT DO NOTHING;