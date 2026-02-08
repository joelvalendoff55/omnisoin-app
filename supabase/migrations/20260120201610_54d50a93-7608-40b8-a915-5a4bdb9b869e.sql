-- Create enum for antecedent types
CREATE TYPE public.antecedent_type AS ENUM ('medical', 'chirurgical', 'familial', 'allergique', 'traitement_en_cours');

-- Create enum for severity
CREATE TYPE public.antecedent_severity AS ENUM ('leger', 'modere', 'severe');

-- Create consultations table
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  consultation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  motif TEXT,
  notes_cliniques TEXT,
  examen_clinique TEXT,
  conclusion TEXT,
  transcript_id UUID REFERENCES public.patient_transcripts(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_antecedents table
CREATE TABLE public.patient_antecedents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  type antecedent_type NOT NULL,
  description TEXT NOT NULL,
  date_debut DATE,
  date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  severity antecedent_severity,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_consultations_patient_id ON public.consultations(patient_id);
CREATE INDEX idx_consultations_structure_id ON public.consultations(structure_id);
CREATE INDEX idx_consultations_date ON public.consultations(consultation_date DESC);
CREATE INDEX idx_patient_antecedents_patient_id ON public.patient_antecedents(patient_id);
CREATE INDEX idx_patient_antecedents_type ON public.patient_antecedents(type);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_antecedents ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultations
CREATE POLICY "consultations_select_same_structure"
  ON public.consultations FOR SELECT
  TO authenticated
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "consultations_insert_staff"
  ON public.consultations FOR INSERT
  TO authenticated
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "consultations_update_staff"
  ON public.consultations FOR UPDATE
  TO authenticated
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "consultations_delete_admin"
  ON public.consultations FOR DELETE
  TO authenticated
  USING (
    structure_id = get_user_structure_id(auth.uid()) AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS policies for patient_antecedents
CREATE POLICY "antecedents_select_same_structure"
  ON public.patient_antecedents FOR SELECT
  TO authenticated
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "antecedents_insert_staff"
  ON public.patient_antecedents FOR INSERT
  TO authenticated
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "antecedents_update_staff"
  ON public.patient_antecedents FOR UPDATE
  TO authenticated
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "antecedents_delete_admin"
  ON public.patient_antecedents FOR DELETE
  TO authenticated
  USING (
    structure_id = get_user_structure_id(auth.uid()) AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger for updated_at on consultations
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on patient_antecedents
CREATE TRIGGER update_patient_antecedents_updated_at
  BEFORE UPDATE ON public.patient_antecedents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();