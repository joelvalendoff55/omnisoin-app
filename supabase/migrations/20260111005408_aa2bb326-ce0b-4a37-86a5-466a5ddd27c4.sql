-- Create patient_transcripts table
CREATE TABLE public.patient_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('mic', 'upload', 'whatsapp', 'phone')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'transcribing', 'ready', 'failed')),
  audio_path TEXT NULL,
  duration_seconds INTEGER NULL,
  language TEXT NULL,
  transcript_text TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_patient_transcripts_structure ON public.patient_transcripts(structure_id);
CREATE INDEX idx_patient_transcripts_patient ON public.patient_transcripts(patient_id);
CREATE INDEX idx_patient_transcripts_status ON public.patient_transcripts(status);
CREATE INDEX idx_patient_transcripts_created_at ON public.patient_transcripts(created_at DESC);

-- Enable RLS
ALTER TABLE public.patient_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transcripts for patients they can access"
ON public.patient_transcripts
FOR SELECT
USING (can_access_patient(auth.uid(), patient_id));

CREATE POLICY "Users can insert transcripts in their structure"
ON public.patient_transcripts
FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can update transcripts for patients they can access"
ON public.patient_transcripts
FOR UPDATE
USING (can_access_patient(auth.uid(), patient_id));

CREATE POLICY "No delete on transcripts"
ON public.patient_transcripts
FOR DELETE
USING (false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_transcripts;

-- Create storage bucket for audio files (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcripts-audio',
  'transcripts-audio',
  false,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4']
);

-- Storage policies for transcripts-audio bucket
CREATE POLICY "Users can upload audio to their structure folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'transcripts-audio' 
  AND (storage.foldername(name))[1] = get_user_structure_id(auth.uid())::text
);

CREATE POLICY "Users can view audio in their structure folder"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'transcripts-audio' 
  AND (storage.foldername(name))[1] = get_user_structure_id(auth.uid())::text
);

CREATE POLICY "Users can delete audio in their structure folder"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'transcripts-audio' 
  AND (storage.foldername(name))[1] = get_user_structure_id(auth.uid())::text
);