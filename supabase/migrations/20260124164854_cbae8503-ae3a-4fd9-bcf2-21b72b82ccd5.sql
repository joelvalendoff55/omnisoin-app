-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_ald BOOLEAN NOT NULL DEFAULT false,
  is_renewable BOOLEAN NOT NULL DEFAULT false,
  renewal_count INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'printed', 'cancelled')),
  signed_at TIMESTAMP WITH TIME ZONE,
  document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add signature_url to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add practitioner legal info to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS rpps_number TEXT,
ADD COLUMN IF NOT EXISTS adeli_number TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Create prescription_templates table for reusable templates
CREATE TABLE public.prescription_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescriptions
CREATE POLICY "Users can view prescriptions in their structure"
ON public.prescriptions FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can create prescriptions in their structure"
ON public.prescriptions FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can update prescriptions in their structure"
ON public.prescriptions FOR UPDATE
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can delete draft prescriptions in their structure"
ON public.prescriptions FOR DELETE
USING (structure_id = get_user_structure_id(auth.uid()) AND status = 'draft');

-- RLS Policies for prescription_templates
CREATE POLICY "Users can view templates in their structure"
ON public.prescription_templates FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can create templates in their structure"
ON public.prescription_templates FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can update their own templates"
ON public.prescription_templates FOR UPDATE
USING (structure_id = get_user_structure_id(auth.uid()) AND (created_by = auth.uid() OR is_shared = true));

CREATE POLICY "Users can delete their own templates"
ON public.prescription_templates FOR DELETE
USING (structure_id = get_user_structure_id(auth.uid()) AND created_by = auth.uid());

-- Indexes for performance
CREATE INDEX idx_prescriptions_structure ON public.prescriptions(structure_id);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_practitioner ON public.prescriptions(practitioner_id);
CREATE INDEX idx_prescriptions_created_at ON public.prescriptions(created_at DESC);
CREATE INDEX idx_prescription_templates_structure ON public.prescription_templates(structure_id);

-- Trigger for updated_at
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescription_templates_updated_at
BEFORE UPDATE ON public.prescription_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for prescriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;