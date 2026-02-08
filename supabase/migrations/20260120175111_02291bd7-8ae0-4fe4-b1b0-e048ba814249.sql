-- ===========================================
-- FIX 1: Medical Records RLS - Use can_access_patient() instead of user_id check
-- ===========================================

-- Drop existing restrictive policies on medical_records
DROP POLICY IF EXISTS "Users can view their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can insert their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can update their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can delete their own medical records" ON public.medical_records;

-- Create new policies that use can_access_patient() for proper access control
-- This allows practitioners, admins, coordinators, and delegated assistants to access records for their patients

CREATE POLICY "Users can view medical records for accessible patients"
ON public.medical_records
FOR SELECT
TO authenticated
USING (can_access_patient(auth.uid(), patient_id));

CREATE POLICY "Users can insert medical records for accessible patients"
ON public.medical_records
FOR INSERT
TO authenticated
WITH CHECK (can_access_patient(auth.uid(), patient_id) AND user_id = auth.uid());

CREATE POLICY "Users can update medical records they created"
ON public.medical_records
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND can_access_patient(auth.uid(), patient_id));

CREATE POLICY "Admins can delete medical records"
ON public.medical_records
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') AND can_access_patient(auth.uid(), patient_id));

-- ===========================================
-- FIX 2: Stats Dashboard View - Use SECURITY INVOKER
-- ===========================================

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.stats_dashboard;

CREATE VIEW public.stats_dashboard
WITH (security_invoker = on) AS
SELECT 
  s.id AS structure_id,
  (SELECT count(*) FROM patients p WHERE p.structure_id = s.id AND p.is_archived = false) AS patients_active,
  (SELECT count(*) FROM patients p WHERE p.structure_id = s.id AND p.is_archived = true) AS patients_archived,
  (SELECT count(*) FROM patients p WHERE p.structure_id = s.id AND p.created_at >= now() - interval '30 days') AS patients_new_30d,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'waiting') AS queue_waiting,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'in_progress') AS queue_in_progress,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'completed' AND pq.completed_at >= CURRENT_DATE) AS queue_completed_today,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.completed_at >= now() - interval '7 days') AS queue_completed_7d,
  (SELECT count(*) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.completed_at >= now() - interval '30 days') AS queue_completed_30d,
  (SELECT COALESCE(avg(EXTRACT(epoch FROM (pq.started_at - pq.arrival_time)) / 60)::integer, 0) FROM patient_queue pq WHERE pq.structure_id = s.id AND pq.started_at IS NOT NULL AND pq.arrival_time IS NOT NULL AND pq.completed_at >= now() - interval '7 days') AS avg_wait_time_minutes_7d,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.status = 'pending') AS tasks_pending,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.status = 'in_progress') AS tasks_in_progress,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.status = 'completed' AND t.completed_at >= now() - interval '7 days') AS tasks_completed_7d,
  (SELECT count(*) FROM tasks t WHERE t.structure_id = s.id AND t.due_date < now() AND t.status != 'completed') AS tasks_overdue,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time::date = CURRENT_DATE) AS appointments_today,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time::date = CURRENT_DATE AND a.status = 'completed') AS appointments_completed_today,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time >= now() - interval '7 days' AND a.start_time < now()) AS appointments_7d,
  (SELECT count(*) FROM appointments a WHERE a.structure_id = s.id AND a.start_time >= now() AND a.start_time < now() + interval '7 days') AS appointments_upcoming_7d,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id) AS inbox_total,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id AND im.patient_id IS NULL) AS inbox_unassigned,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id AND im.created_at >= now() - interval '7 days') AS inbox_7d,
  (SELECT count(*) FROM inbox_messages im WHERE im.structure_id = s.id AND im.created_at >= now() - interval '30 days') AS inbox_30d,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id) AS transcripts_total,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'uploaded') AS transcripts_uploaded,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'ready') AS transcripts_ready,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'failed') AS transcripts_failed,
  (SELECT count(*) FROM patient_transcripts pt WHERE pt.structure_id = s.id AND pt.created_at >= now() - interval '7 days') AS transcripts_7d,
  (SELECT count(*) FROM transcript_summaries ts WHERE ts.structure_id = s.id AND ts.status = 'ready') AS summaries_ready,
  (SELECT count(*) FROM transcript_summaries ts WHERE ts.structure_id = s.id AND ts.status = 'failed') AS summaries_failed,
  (SELECT COALESCE(avg(ts.latency_ms)::integer, 0) FROM transcript_summaries ts WHERE ts.structure_id = s.id AND ts.created_at >= now() - interval '7 days') AS avg_summary_latency_ms_7d
FROM structures s
WHERE s.is_active = true;