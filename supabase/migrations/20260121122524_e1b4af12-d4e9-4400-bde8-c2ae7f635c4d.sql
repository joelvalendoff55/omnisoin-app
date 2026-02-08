-- Create consultation_anamnesis table for AI-generated structured summaries
CREATE TABLE public.consultation_anamnesis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES public.consultations(id),
  transcript_id UUID NOT NULL REFERENCES public.patient_transcripts(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  structure_id UUID NOT NULL REFERENCES public.structures(id),
  
  -- Assistant summary (pre-consultation)
  assistant_summary JSONB DEFAULT '{}'::jsonb,
  -- Fields: motif, symptomes_principaux, antecedents_pertinents, infos_admin, niveau_urgence
  
  -- Doctor summary (clinical analysis)
  doctor_summary JSONB DEFAULT '{}'::jsonb,
  -- Fields: histoire_maladie, antecedents, symptomes_details, facteurs, hypotheses_diagnostiques, examens_suggeres
  
  -- Full structured data
  structured_data JSONB DEFAULT '{}'::jsonb,
  
  -- AI metadata
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_used TEXT,
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.consultation_anamnesis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "anamnesis_select_same_structure"
ON public.consultation_anamnesis
FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "anamnesis_insert_staff"
ON public.consultation_anamnesis
FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "anamnesis_update_staff"
ON public.consultation_anamnesis
FOR UPDATE
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "anamnesis_delete_admin"
ON public.consultation_anamnesis
FOR DELETE
USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE TRIGGER update_anamnesis_updated_at
BEFORE UPDATE ON public.consultation_anamnesis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_anamnesis;

-- Add index for faster lookups
CREATE INDEX idx_anamnesis_transcript_id ON public.consultation_anamnesis(transcript_id);
CREATE INDEX idx_anamnesis_patient_id ON public.consultation_anamnesis(patient_id);
CREATE INDEX idx_anamnesis_status ON public.consultation_anamnesis(status);