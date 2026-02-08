-- Add medical validation columns to patient_transcripts
ALTER TABLE public.patient_transcripts 
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Add validation_status type action to activity logs
-- (TRANSCRIPT_VALIDATED action will be logged)

-- Create index for faster queries on validated transcripts
CREATE INDEX IF NOT EXISTS idx_patient_transcripts_validated 
ON public.patient_transcripts(validated_at) 
WHERE validated_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.patient_transcripts.validated_by IS 'User ID of the practitioner who validated the transcript';
COMMENT ON COLUMN public.patient_transcripts.validated_at IS 'Timestamp when the transcript was medically validated';