-- Table des examens complémentaires disponibles
CREATE TABLE public.complementary_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  indications TEXT[], -- Indications principales
  contraindications TEXT[], -- Contre-indications
  duration_minutes INTEGER,
  preparation_instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.complementary_exams ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone authenticated can view active exams (reference data)
CREATE POLICY "Anyone can view active exams"
ON public.complementary_exams
FOR SELECT
USING (is_active = true);

-- Policy: Admins can manage exams (using user_roles table)
CREATE POLICY "Admins can manage exams"
ON public.complementary_exams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.is_active = true
  )
);

-- Table pour les prescriptions d'examens
CREATE TABLE public.exam_prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.complementary_exams(id),
  prescribed_by UUID NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id),
  structure_id UUID NOT NULL REFERENCES public.structures(id),
  indication TEXT NOT NULL, -- Justification clinique
  priority VARCHAR(20) DEFAULT 'normal', -- urgent, normal, low
  status VARCHAR(30) DEFAULT 'prescribed', -- prescribed, scheduled, completed, cancelled
  notes TEXT,
  scheduled_date DATE,
  completed_date DATE,
  results TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_prescriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view prescriptions in their structure
CREATE POLICY "Users can view prescriptions in their structure"
ON public.exam_prescriptions
FOR SELECT
USING (
  structure_id = get_user_structure_id(auth.uid())
);

-- Policy: Healthcare providers can create prescriptions (using org_members)
CREATE POLICY "Healthcare providers can create prescriptions"
ON public.exam_prescriptions
FOR INSERT
WITH CHECK (
  is_healthcare_provider(auth.uid(), structure_id)
);

-- Policy: Healthcare providers can update prescriptions in their structure
CREATE POLICY "Healthcare providers can update prescriptions"
ON public.exam_prescriptions
FOR UPDATE
USING (
  is_healthcare_provider(auth.uid(), structure_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_complementary_exams_updated_at
BEFORE UPDATE ON public.complementary_exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_prescriptions_updated_at
BEFORE UPDATE ON public.exam_prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the available exams
INSERT INTO public.complementary_exams (code, name, description, category, indications, duration_minutes, preparation_instructions) VALUES
('PVN', 'Polygraphie Ventilatoire Nocturne', 'Enregistrement nocturne pour détecter les apnées du sommeil', 'Pneumologie', ARRAY['Ronflements', 'Somnolence diurne', 'Apnées constatées', 'Obésité avec fatigue', 'HTA résistante'], 480, 'Ne pas consommer d''alcool la veille. Éviter les somnifères.'),
('ECG', 'Électrocardiogramme', 'Enregistrement de l''activité électrique du cœur', 'Cardiologie', ARRAY['Douleur thoracique', 'Palpitations', 'Dyspnée', 'Syncope', 'Bilan préopératoire'], 15, 'Aucune préparation particulière.'),
('SPIRO', 'Spirométrie', 'Exploration fonctionnelle respiratoire mesurant les volumes et débits pulmonaires', 'Pneumologie', ARRAY['Dyspnée chronique', 'Toux chronique', 'Asthme suspecté', 'BPCO', 'Tabagisme'], 30, 'Ne pas fumer 4h avant. Éviter bronchodilatateurs si possible.'),
('MAPA', 'Holter MAPA', 'Mesure ambulatoire de la pression artérielle sur 24 heures', 'Cardiologie', ARRAY['HTA suspecte', 'HTA blouse blanche', 'Évaluation traitement antihypertenseur', 'HTA masquée', 'Variabilité tensionnelle'], 1440, 'Activités normales. Tenir un journal des activités.'),
('HOLTER_ECG', 'Holter ECG', 'Enregistrement continu du rythme cardiaque sur 24-48h', 'Cardiologie', ARRAY['Palpitations intermittentes', 'Syncopes inexpliquées', 'Fibrillation auriculaire', 'Évaluation antiarythmiques', 'Malaises'], 1440, 'Activités normales. Noter les symptômes ressentis.'),
('CRYO', 'Cryothérapie', 'Traitement par le froid des lésions cutanées bénignes', 'Dermatologie', ARRAY['Verrues', 'Kératoses actiniques', 'Molluscum', 'Lésions bénignes superficielles'], 15, 'Zone propre et sèche.'),
('DERMATO', 'Dermatoscopie', 'Examen des lésions pigmentées avec dermatoscope', 'Dermatologie', ARRAY['Naevus atypique', 'Surveillance mélanome', 'Lésion pigmentée suspecte', 'Dépistage cancer cutané'], 20, 'Aucune préparation. Ne pas appliquer de crème.');

-- Enable realtime for exam_prescriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_prescriptions;