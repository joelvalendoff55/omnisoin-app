-- Create hospital_passages table for hospital/emergency visits
CREATE TABLE public.hospital_passages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  structure_id UUID NOT NULL,
  passage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  passage_type TEXT NOT NULL CHECK (passage_type IN ('urgences', 'hospitalisation')),
  etablissement TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'standard' CHECK (risk_level IN ('eleve', 'modere', 'standard')),
  motif TEXT,
  -- AI structured summary fields
  diagnostics TEXT,
  examens_cles TEXT,
  traitements TEXT,
  suivi_recommande TEXT,
  -- Tasks to do in town
  taches_ville JSONB DEFAULT '[]'::jsonb,
  -- Metadata
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hospital_passages ENABLE ROW LEVEL SECURITY;

-- Create policies for same structure access
CREATE POLICY "hospital_passages_select_same_structure"
ON public.hospital_passages
FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "hospital_passages_insert_staff"
ON public.hospital_passages
FOR INSERT
WITH CHECK ((structure_id = get_user_structure_id(auth.uid())) AND (created_by = auth.uid()));

CREATE POLICY "hospital_passages_update_staff"
ON public.hospital_passages
FOR UPDATE
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "hospital_passages_delete_admin"
ON public.hospital_passages
FOR DELETE
USING ((structure_id = get_user_structure_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hospital_passages_updated_at
BEFORE UPDATE ON public.hospital_passages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();