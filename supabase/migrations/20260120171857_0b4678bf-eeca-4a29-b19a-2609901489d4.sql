-- Create a stats_dashboard view that aggregates key metrics by structure
-- This view provides patient, queue, task, appointment, document and transcript metrics
-- RLS is enforced through the get_user_structure_id() function

CREATE OR REPLACE VIEW public.stats_dashboard AS
SELECT 
  s.id as structure_id,
  
  -- Patient metrics
  (SELECT COUNT(*) FROM public.patients p WHERE p.structure_id = s.id AND p.is_archived = false) as patients_active,
  (SELECT COUNT(*) FROM public.patients p WHERE p.structure_id = s.id AND p.is_archived = true) as patients_archived,
  (SELECT COUNT(*) FROM public.patients p WHERE p.structure_id = s.id AND p.created_at >= NOW() - INTERVAL '30 days') as patients_new_30d,
  
  -- Queue metrics
  (SELECT COUNT(*) FROM public.patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'waiting') as queue_waiting,
  (SELECT COUNT(*) FROM public.patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'in_progress') as queue_in_progress,
  (SELECT COUNT(*) FROM public.patient_queue pq WHERE pq.structure_id = s.id AND pq.status = 'completed' AND pq.completed_at >= CURRENT_DATE) as queue_completed_today,
  (SELECT COUNT(*) FROM public.patient_queue pq WHERE pq.structure_id = s.id AND pq.completed_at >= NOW() - INTERVAL '7 days') as queue_completed_7d,
  (SELECT COUNT(*) FROM public.patient_queue pq WHERE pq.structure_id = s.id AND pq.completed_at >= NOW() - INTERVAL '30 days') as queue_completed_30d,
  (SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (pq.started_at - pq.arrival_time)) / 60)::integer, 0
  ) FROM public.patient_queue pq 
   WHERE pq.structure_id = s.id 
   AND pq.started_at IS NOT NULL 
   AND pq.arrival_time IS NOT NULL
   AND pq.completed_at >= NOW() - INTERVAL '7 days'
  ) as avg_wait_time_minutes_7d,
  
  -- Task metrics
  (SELECT COUNT(*) FROM public.tasks t WHERE t.structure_id = s.id AND t.status = 'pending') as tasks_pending,
  (SELECT COUNT(*) FROM public.tasks t WHERE t.structure_id = s.id AND t.status = 'in_progress') as tasks_in_progress,
  (SELECT COUNT(*) FROM public.tasks t WHERE t.structure_id = s.id AND t.status = 'completed' AND t.completed_at >= NOW() - INTERVAL '7 days') as tasks_completed_7d,
  (SELECT COUNT(*) FROM public.tasks t WHERE t.structure_id = s.id AND t.due_date < NOW() AND t.status != 'completed') as tasks_overdue,
  
  -- Appointment metrics
  (SELECT COUNT(*) FROM public.appointments a WHERE a.structure_id = s.id AND a.start_time::date = CURRENT_DATE) as appointments_today,
  (SELECT COUNT(*) FROM public.appointments a WHERE a.structure_id = s.id AND a.start_time::date = CURRENT_DATE AND a.status = 'completed') as appointments_completed_today,
  (SELECT COUNT(*) FROM public.appointments a WHERE a.structure_id = s.id AND a.start_time >= NOW() - INTERVAL '7 days' AND a.start_time < NOW()) as appointments_7d,
  (SELECT COUNT(*) FROM public.appointments a WHERE a.structure_id = s.id AND a.start_time >= NOW() AND a.start_time < NOW() + INTERVAL '7 days') as appointments_upcoming_7d,
  
  -- Inbox/Document metrics
  (SELECT COUNT(*) FROM public.inbox_messages im WHERE im.structure_id = s.id) as inbox_total,
  (SELECT COUNT(*) FROM public.inbox_messages im WHERE im.structure_id = s.id AND im.patient_id IS NULL) as inbox_unassigned,
  (SELECT COUNT(*) FROM public.inbox_messages im WHERE im.structure_id = s.id AND im.created_at >= NOW() - INTERVAL '7 days') as inbox_7d,
  (SELECT COUNT(*) FROM public.inbox_messages im WHERE im.structure_id = s.id AND im.created_at >= NOW() - INTERVAL '30 days') as inbox_30d,
  
  -- Transcript metrics
  (SELECT COUNT(*) FROM public.patient_transcripts pt WHERE pt.structure_id = s.id) as transcripts_total,
  (SELECT COUNT(*) FROM public.patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'uploaded') as transcripts_uploaded,
  (SELECT COUNT(*) FROM public.patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'ready') as transcripts_ready,
  (SELECT COUNT(*) FROM public.patient_transcripts pt WHERE pt.structure_id = s.id AND pt.status = 'failed') as transcripts_failed,
  (SELECT COUNT(*) FROM public.patient_transcripts pt WHERE pt.structure_id = s.id AND pt.created_at >= NOW() - INTERVAL '7 days') as transcripts_7d,
  
  -- Summary metrics
  (SELECT COUNT(*) FROM public.transcript_summaries ts WHERE ts.structure_id = s.id AND ts.status = 'ready') as summaries_ready,
  (SELECT COUNT(*) FROM public.transcript_summaries ts WHERE ts.structure_id = s.id AND ts.status = 'failed') as summaries_failed,
  (SELECT COALESCE(AVG(ts.latency_ms), 0)::integer FROM public.transcript_summaries ts WHERE ts.structure_id = s.id AND ts.status = 'ready' AND ts.created_at >= NOW() - INTERVAL '7 days') as avg_summary_latency_ms_7d
  
FROM public.structures s
WHERE s.is_active = true;

-- Add comment to describe the view
COMMENT ON VIEW public.stats_dashboard IS 'Aggregated statistics dashboard view with patient, queue, task, appointment, document and transcript metrics per structure';

-- Enable RLS-like access through a security definer function
-- Users can only query stats for their own structure
CREATE OR REPLACE FUNCTION public.get_stats_dashboard()
RETURNS TABLE (
  structure_id uuid,
  patients_active bigint,
  patients_archived bigint,
  patients_new_30d bigint,
  queue_waiting bigint,
  queue_in_progress bigint,
  queue_completed_today bigint,
  queue_completed_7d bigint,
  queue_completed_30d bigint,
  avg_wait_time_minutes_7d integer,
  tasks_pending bigint,
  tasks_in_progress bigint,
  tasks_completed_7d bigint,
  tasks_overdue bigint,
  appointments_today bigint,
  appointments_completed_today bigint,
  appointments_7d bigint,
  appointments_upcoming_7d bigint,
  inbox_total bigint,
  inbox_unassigned bigint,
  inbox_7d bigint,
  inbox_30d bigint,
  transcripts_total bigint,
  transcripts_uploaded bigint,
  transcripts_ready bigint,
  transcripts_failed bigint,
  transcripts_7d bigint,
  summaries_ready bigint,
  summaries_failed bigint,
  avg_summary_latency_ms_7d integer
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.stats_dashboard 
  WHERE structure_id = get_user_structure_id(auth.uid());
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_stats_dashboard() TO authenticated;