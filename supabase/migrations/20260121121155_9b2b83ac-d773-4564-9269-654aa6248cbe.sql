-- Add consultation_id and recorder_type to patient_transcripts
ALTER TABLE public.patient_transcripts
ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recorder_type TEXT CHECK (recorder_type IN ('assistant', 'doctor', 'coordinator', 'manual')) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS queue_entry_id UUID REFERENCES public.patient_queue(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_transcripts_consultation_id ON public.patient_transcripts(consultation_id);
CREATE INDEX IF NOT EXISTS idx_patient_transcripts_queue_entry_id ON public.patient_transcripts(queue_entry_id);

-- Comment for documentation
COMMENT ON COLUMN public.patient_transcripts.consultation_id IS 'Link to the consultation this transcript belongs to';
COMMENT ON COLUMN public.patient_transcripts.recorder_type IS 'Who recorded the audio: assistant, doctor, coordinator, or manual upload';
COMMENT ON COLUMN public.patient_transcripts.queue_entry_id IS 'Link to the queue entry when auto-recording is triggered';