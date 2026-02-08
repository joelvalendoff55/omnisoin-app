-- Fix: Recréer la vue sans SECURITY DEFINER (utilise les permissions de l'appelant)
DROP VIEW IF EXISTS public.patient_queue_status_timeline;

CREATE VIEW public.patient_queue_status_timeline AS
SELECT 
  h.id,
  h.queue_id,
  h.structure_id,
  pq.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  h.previous_status,
  h.new_status,
  h.changed_by,
  pr.first_name || ' ' || pr.last_name AS changed_by_name,
  h.changed_at,
  h.change_reason,
  h.metadata,
  EXTRACT(EPOCH FROM (h.changed_at - LAG(h.changed_at) OVER (PARTITION BY h.queue_id ORDER BY h.changed_at))) / 60 AS duration_in_previous_status_minutes
FROM public.patient_queue_status_history h
JOIN public.patient_queue pq ON h.queue_id = pq.id
JOIN public.patients p ON pq.patient_id = p.id
LEFT JOIN public.profiles pr ON h.changed_by = pr.user_id;