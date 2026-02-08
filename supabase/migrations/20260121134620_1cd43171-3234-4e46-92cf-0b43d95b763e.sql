-- Fix SECURITY DEFINER views: add security_invoker = on to both views

-- 1. Recréer stats_dashboard avec security_invoker = on
DROP VIEW IF EXISTS public.stats_dashboard;

CREATE VIEW public.stats_dashboard
WITH (security_invoker = on)
AS
SELECT 
  s.id AS structure_id,
  (SELECT count(*) FROM patients p WHERE p.structure_id = s.id AND p.is_archived = false) AS patients_active,
  (SELECT count(*) FROM patients p WHERE p.structure_id = s.id AND p.is_archived = true) AS patients_archived,
  (SELECT count(*) FROM patients p WHERE p.structure_id = s.id AND p.created_at >= (now() - interval '30 days')) AS patients_new_30d,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'waiting') AS queue_waiting,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'in_consultation') AS queue_in_progress,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'completed' AND pq.completed_at >= CURRENT_DATE) AS queue_completed_today,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.completed_at >= (now() - interval '7 days')) AS queue_completed_7d,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.completed_at >= (now() - interval '30 days')) AS queue_completed_30d,
  (SELECT COALESCE((avg(EXTRACT(epoch FROM (pq.started_at - pq.arrival_time)) / 60))::integer, 0) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.started_at IS NOT NULL AND pq.arrival_time IS NOT NULL AND pq.completed_at >= (now() - interval '7 days')) AS avg_wait_time_minutes_7d,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.status = 'pending') AS tasks_pending,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.status = 'in_progress') AS tasks_in_progress,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.status = 'completed' AND t.completed_at >= (now() - interval '7 days')) AS tasks_completed_7d,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.due_date < now() AND t.status <> 'completed') AS tasks_overdue,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time::date = CURRENT_DATE) AS appointments_today,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time::date = CURRENT_DATE AND a.status = 'completed') AS appointments_completed_today,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time >= (now() - interval '7 days') AND a.start_time < now()) AS appointments_7d,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time >= now() AND a.start_time < (now() + interval '7 days')) AS appointments_upcoming_7d,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id) AS inbox_total,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id AND im.patient_id IS NULL) AS inbox_unassigned,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id AND im.created_at >= (now() - interval '7 days')) AS inbox_7d,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id AND im.created_at >= (now() - interval '30 days')) AS inbox_30d,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id) AS transcripts_total,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'uploaded') AS transcripts_uploaded,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'ready') AS transcripts_ready,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'failed') AS transcripts_failed,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.created_at >= (now() - interval '7 days')) AS transcripts_7d,
  (SELECT count(*) FROM consultation_anamnesis ca WHERE ca.structure_id = s.id AND ca.status = 'completed') AS summaries_ready,
  (SELECT count(*) FROM consultation_anamnesis ca WHERE ca.structure_id = s.id AND ca.status = 'failed') AS summaries_failed,
  (SELECT COALESCE(avg(ca.processing_time_ms)::integer, 0) FROM consultation_anamnesis ca WHERE ca.structure_id = s.id AND ca.created_at >= (now() - interval '7 days') AND ca.processing_time_ms IS NOT NULL) AS avg_summary_latency_ms_7d
FROM structures s;

-- 2. Recréer patient_queue_status_timeline avec security_invoker = on
DROP VIEW IF EXISTS public.patient_queue_status_timeline;

CREATE VIEW public.patient_queue_status_timeline
WITH (security_invoker = on)
AS
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