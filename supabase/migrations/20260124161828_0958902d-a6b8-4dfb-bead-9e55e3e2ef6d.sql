-- Create OCR import history table
CREATE TABLE public.ocr_import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  document_title TEXT,
  imported_by UUID NOT NULL,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  medications_count INTEGER NOT NULL DEFAULT 0,
  diagnoses_count INTEGER NOT NULL DEFAULT 0,
  procedures_count INTEGER NOT NULL DEFAULT 0,
  antecedent_ids UUID[] NOT NULL DEFAULT '{}',
  reverted_at TIMESTAMP WITH TIME ZONE,
  reverted_by UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reverted'))
);

-- Enable RLS
ALTER TABLE public.ocr_import_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view OCR imports in their structure"
ON public.ocr_import_history
FOR SELECT
USING (
  structure_id IN (
    SELECT structure_id FROM public.org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create OCR imports in their structure"
ON public.ocr_import_history
FOR INSERT
WITH CHECK (
  structure_id IN (
    SELECT structure_id FROM public.org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update OCR imports in their structure"
ON public.ocr_import_history
FOR UPDATE
USING (
  structure_id IN (
    SELECT structure_id FROM public.org_members WHERE user_id = auth.uid()
  )
);

-- Index for faster queries
CREATE INDEX idx_ocr_import_history_patient ON public.ocr_import_history(patient_id);
CREATE INDEX idx_ocr_import_history_structure ON public.ocr_import_history(structure_id);
CREATE INDEX idx_ocr_import_history_status ON public.ocr_import_history(status);