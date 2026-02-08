-- Add fields for improved assistant→doctor workflow
ALTER TABLE public.patient_queue 
ADD COLUMN IF NOT EXISTS assistant_notes TEXT,
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS vitals_data JSONB DEFAULT '{}'::jsonb;

-- Create index for quick lookup of ready patients
CREATE INDEX IF NOT EXISTS idx_patient_queue_ready 
ON public.patient_queue (structure_id, status) 
WHERE status IN ('called', 'in_consultation');

-- Comment on columns
COMMENT ON COLUMN public.patient_queue.assistant_notes IS 'Notes from assistant during pre-consultation';
COMMENT ON COLUMN public.patient_queue.ready_at IS 'Timestamp when patient was marked ready for consultation';
COMMENT ON COLUMN public.patient_queue.vitals_data IS 'JSONB containing vital signs recorded during pre-consultation';