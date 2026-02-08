-- Sprint 28: Consultation Reasons (Motifs de consultation)

-- Create consultation_reasons table
CREATE TABLE IF NOT EXISTS public.consultation_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  default_duration INTEGER DEFAULT 15,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(structure_id, code)
);

-- Indexes
CREATE INDEX idx_reasons_structure ON public.consultation_reasons(structure_id);
CREATE INDEX idx_reasons_category ON public.consultation_reasons(structure_id, category);

-- Enable RLS
ALTER TABLE public.consultation_reasons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "reasons_select_same_structure" ON public.consultation_reasons 
FOR SELECT USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "reasons_insert_admin" ON public.consultation_reasons 
FOR INSERT WITH CHECK (structure_id = get_user_structure_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator')));

CREATE POLICY "reasons_update_admin" ON public.consultation_reasons 
FOR UPDATE USING (structure_id = get_user_structure_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator')));

CREATE POLICY "reasons_delete_admin" ON public.consultation_reasons 
FOR DELETE USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Add reason_id to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reason_id UUID REFERENCES public.consultation_reasons(id) ON DELETE SET NULL;

-- Add reason_id to patient_queue
ALTER TABLE public.patient_queue ADD COLUMN IF NOT EXISTS reason_id UUID REFERENCES public.consultation_reasons(id) ON DELETE SET NULL;

-- Seed data for common reasons
INSERT INTO public.consultation_reasons (structure_id, code, label, category, default_duration, color, sort_order) 
SELECT s.id, 'CONS_GEN', 'Consultation générale', 'acute', 15, '#3B82F6', 1 FROM public.structures s
UNION ALL SELECT s.id, 'URGENCE', 'Urgence', 'acute', 20, '#EF4444', 2 FROM public.structures s
UNION ALL SELECT s.id, 'SUIVI_CHRON', 'Suivi maladie chronique', 'chronic', 20, '#8B5CF6', 3 FROM public.structures s
UNION ALL SELECT s.id, 'VACCIN', 'Vaccination', 'prevention', 10, '#10B981', 4 FROM public.structures s
UNION ALL SELECT s.id, 'CERTIF', 'Certificat médical', 'administrative', 10, '#F59E0B', 5 FROM public.structures s
UNION ALL SELECT s.id, 'RENOUVELLEMENT', 'Renouvellement ordonnance', 'chronic', 10, '#6366F1', 6 FROM public.structures s;