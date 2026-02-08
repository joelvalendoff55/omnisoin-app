-- 1. Créer la structure "Démo OmniSoin" si elle n'existe pas
INSERT INTO public.structures (name, slug, country, timezone, is_active, email)
SELECT 'Démo OmniSoin', 'demo-omnisoin', 'FR', 'Europe/Paris', true, 'admin@omnisoin.fr'
WHERE NOT EXISTS (SELECT 1 FROM public.structures WHERE slug = 'demo-omnisoin');

-- 2. Créer une variable pour stocker l'ID de la structure
DO $$
DECLARE
  v_structure_id UUID;
  v_user_id UUID;
BEGIN
  -- Récupérer l'ID de la structure démo
  SELECT id INTO v_structure_id FROM public.structures WHERE slug = 'demo-omnisoin';
  
  -- Mettre à jour tous les profiles sans structure_id
  UPDATE public.profiles
  SET structure_id = v_structure_id, updated_at = now()
  WHERE structure_id IS NULL;
  
  -- Ajouter tous les utilisateurs existants à org_members s'ils n'y sont pas
  INSERT INTO public.org_members (user_id, structure_id, org_role, is_active, accepted_at)
  SELECT p.user_id, v_structure_id, 'admin', true, now()
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.org_members om 
    WHERE om.user_id = p.user_id AND om.structure_id = v_structure_id
  );
  
  -- Mettre à jour les team_members sans structure_id
  UPDATE public.team_members
  SET structure_id = v_structure_id
  WHERE structure_id IS NULL;
  
  -- Associer les team_members existants à la structure démo si pas déjà associés
  UPDATE public.team_members
  SET structure_id = v_structure_id
  WHERE structure_id NOT IN (SELECT id FROM public.structures);
  
  -- Ajouter user_roles pour les utilisateurs qui n'en ont pas
  INSERT INTO public.user_roles (user_id, structure_id, role, is_active)
  SELECT p.user_id, v_structure_id, 'admin', true
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id AND ur.structure_id = v_structure_id
  );
END $$;