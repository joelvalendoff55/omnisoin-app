-- Sprint 39: Add robustness fields to transcript_summaries

-- Add started_at for anti-stuck tracking
ALTER TABLE public.transcript_summaries
ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Add error_details for structured error info
ALTER TABLE public.transcript_summaries
ADD COLUMN IF NOT EXISTS error_details jsonb;

-- Add latency_ms for generation time tracking
ALTER TABLE public.transcript_summaries
ADD COLUMN IF NOT EXISTS latency_ms integer;

-- Note: error_message and model_used already exist in the table