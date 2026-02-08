-- Create documents table for storing patient documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  mime_type TEXT,
  source TEXT DEFAULT 'upload',
  status TEXT DEFAULT 'uploaded',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "Users can view documents in their structure"
  ON public.documents FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can insert documents in their structure"
  ON public.documents FOR INSERT
  WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can update documents in their structure"
  ON public.documents FOR UPDATE
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Create document_ocr table for storing OCR results
CREATE TABLE IF NOT EXISTS public.document_ocr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  raw_text TEXT,
  extracted_data JSONB DEFAULT '{}',
  confidence NUMERIC(3,2),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on document_ocr
ALTER TABLE public.document_ocr ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_ocr - using security definer function for performance
CREATE OR REPLACE FUNCTION public.can_access_document(_document_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
    AND d.structure_id = get_user_structure_id(auth.uid())
  );
$$;

CREATE POLICY "Users can view OCR of their structure documents"
  ON public.document_ocr FOR SELECT
  USING (can_access_document(document_id));

CREATE POLICY "Users can insert OCR for their structure documents"
  ON public.document_ocr FOR INSERT
  WITH CHECK (can_access_document(document_id));

CREATE POLICY "Users can update OCR for their structure documents"
  ON public.document_ocr FOR UPDATE
  USING (can_access_document(document_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_structure_id ON public.documents(structure_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_ocr_document_id ON public.document_ocr(document_id);

-- Add comments
COMMENT ON TABLE public.documents IS 'Patient documents including scans, uploads, and files';
COMMENT ON TABLE public.document_ocr IS 'OCR results for scanned documents';
COMMENT ON FUNCTION public.can_access_document IS 'Check if user can access a document based on structure membership';