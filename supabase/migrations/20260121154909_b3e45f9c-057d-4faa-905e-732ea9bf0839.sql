-- Corriger le warning Security Definer View
-- Recréer la vue avec SECURITY INVOKER pour respecter les permissions de l'utilisateur courant

DROP VIEW IF EXISTS public.org_members_with_details;

CREATE VIEW public.org_members_with_details
WITH (security_invoker = on)
AS
SELECT 
  om.id,
  om.user_id,
  om.structure_id,
  om.site_id,
  om.org_role,
  om.is_active,
  om.invited_at,
  om.accepted_at,
  om.created_at,
  s.name AS structure_name,
  s.slug AS structure_slug,
  si.name AS site_name,
  p.first_name,
  p.last_name,
  tm.job_title,
  tm.specialty,
  tm.professional_id
FROM public.org_members om
JOIN public.structures s ON s.id = om.structure_id
LEFT JOIN public.sites si ON si.id = om.site_id
LEFT JOIN public.profiles p ON p.user_id = om.user_id
LEFT JOIN public.team_members tm ON tm.user_id = om.user_id AND tm.structure_id = om.structure_id;

COMMENT ON VIEW public.org_members_with_details IS 'Vue des membres avec leurs détails (profil, équipe, site) - SECURITY INVOKER';