
-- Supprimer si existe partiellement
DROP TABLE IF EXISTS public.patient_vital_signs CASCADE;

-- Recréer la table des constantes vitales patient
CREATE TABLE public.patient_vital_signs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constantes vitales
  systolic_bp INTEGER, -- Tension systolique (mmHg)
  diastolic_bp INTEGER, -- Tension diastolique (mmHg)
  heart_rate INTEGER, -- Fréquence cardiaque (bpm)
  weight_kg NUMERIC(5,2), -- Poids en kg
  height_cm INTEGER, -- Taille en cm
  bmi NUMERIC(4,1), -- IMC calculé automatiquement
  
  -- Notes
  assistant_notes TEXT,
  practitioner_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_vital_signs_patient ON public.patient_vital_signs(patient_id);
CREATE INDEX idx_vital_signs_structure ON public.patient_vital_signs(structure_id);
CREATE INDEX idx_vital_signs_recorded_at ON public.patient_vital_signs(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.patient_vital_signs ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view vital signs for their structure
CREATE POLICY "Members can view vital signs"
ON public.patient_vital_signs
FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
);

-- Policy: Staff can create vital signs (assistants, nurses, doctors, etc.)
CREATE POLICY "Staff can create vital signs"
ON public.patient_vital_signs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.structure_id = patient_vital_signs.structure_id
    AND org_members.user_id = auth.uid()
    AND org_members.org_role IN ('owner', 'admin', 'doctor', 'ipa', 'nurse', 'assistant', 'coordinator')
    AND org_members.is_active = true
    AND org_members.archived_at IS NULL
  )
);

-- Policy: Staff can update vital signs
CREATE POLICY "Staff can update vital signs"
ON public.patient_vital_signs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.structure_id = patient_vital_signs.structure_id
    AND org_members.user_id = auth.uid()
    AND org_members.org_role IN ('owner', 'admin', 'doctor', 'ipa', 'nurse', 'assistant', 'coordinator')
    AND org_members.is_active = true
    AND org_members.archived_at IS NULL
  )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_vital_signs_updated_at
BEFORE UPDATE ON public.patient_vital_signs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_vital_signs;
