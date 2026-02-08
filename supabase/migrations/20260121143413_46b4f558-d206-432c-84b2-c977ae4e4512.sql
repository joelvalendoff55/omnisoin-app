-- Fix security definer views issues

-- Drop and recreate export_audit_timeline without SECURITY DEFINER
DROP VIEW IF EXISTS public.export_audit_timeline;

CREATE VIEW public.export_audit_timeline
WITH (security_invoker = on)
AS
SELECT 
  er.id,
  er.requester_id,
  p.first_name || ' ' || p.last_name AS requester_name,
  er.structure_id,
  er.patient_id,
  er.export_type,
  er.export_format,
  er.legal_basis,
  er.justification,
  er.date_range_start,
  er.date_range_end,
  er.status,
  er.file_url,
  er.file_hash,
  er.expiration_date,
  er.created_at,
  er.completed_at,
  er.error_message
FROM public.export_requests er
LEFT JOIN public.profiles p ON er.requester_id = p.user_id
ORDER BY er.created_at DESC;