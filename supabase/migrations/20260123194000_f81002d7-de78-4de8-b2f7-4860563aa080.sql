
-- Table for structure settings (extended structure info)
CREATE TABLE IF NOT EXISTS public.structure_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  siret TEXT,
  specialty TEXT,
  capacity INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(structure_id)
);

-- Table for structure opening hours
CREATE TABLE IF NOT EXISTS public.structure_opening_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(structure_id, day_of_week)
);

-- Table for practitioner schedules (weekly work slots)
CREATE TABLE IF NOT EXISTS public.practitioner_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, day_of_week, start_time)
);

-- Table for practitioner absences
CREATE TABLE IF NOT EXISTS public.practitioner_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  absence_type TEXT NOT NULL DEFAULT 'conge', -- conge, maladie, formation, autre
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for priority levels customization
CREATE TABLE IF NOT EXISTS public.queue_priority_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  label TEXT NOT NULL,
  color TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(structure_id, level)
);

-- Enable RLS on all tables
ALTER TABLE public.structure_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structure_opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_priority_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for structure_settings
CREATE POLICY "Users can view their structure settings"
  ON public.structure_settings FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can manage structure settings"
  ON public.structure_settings FOR ALL
  USING (structure_id = get_user_structure_id(auth.uid()));

-- RLS Policies for structure_opening_hours
CREATE POLICY "Users can view their structure hours"
  ON public.structure_opening_hours FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can manage structure hours"
  ON public.structure_opening_hours FOR ALL
  USING (structure_id = get_user_structure_id(auth.uid()));

-- RLS Policies for practitioner_schedules
CREATE POLICY "Users can view practitioner schedules"
  ON public.practitioner_schedules FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can manage practitioner schedules"
  ON public.practitioner_schedules FOR ALL
  USING (structure_id = get_user_structure_id(auth.uid()));

-- RLS Policies for practitioner_absences
CREATE POLICY "Users can view practitioner absences"
  ON public.practitioner_absences FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can manage practitioner absences"
  ON public.practitioner_absences FOR ALL
  USING (structure_id = get_user_structure_id(auth.uid()));

-- RLS Policies for queue_priority_levels
CREATE POLICY "Users can view priority levels"
  ON public.queue_priority_levels FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can manage priority levels"
  ON public.queue_priority_levels FOR ALL
  USING (structure_id = get_user_structure_id(auth.uid()));

-- Create storage bucket for structure logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('structure-logos', 'structure-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for structure logos
CREATE POLICY "Anyone can view structure logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'structure-logos');

CREATE POLICY "Admins can upload structure logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'structure-logos');

CREATE POLICY "Admins can update structure logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'structure-logos');

CREATE POLICY "Admins can delete structure logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'structure-logos');

-- Insert default priority levels for existing structures
INSERT INTO public.queue_priority_levels (structure_id, level, label, color, description)
SELECT s.id, 1, 'Urgence vitale', '#EF4444', 'Priorité maximale - urgence vitale'
FROM public.structures s
WHERE NOT EXISTS (SELECT 1 FROM public.queue_priority_levels WHERE structure_id = s.id AND level = 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.queue_priority_levels (structure_id, level, label, color, description)
SELECT s.id, 2, 'Urgence', '#F97316', 'Cas urgent nécessitant une prise en charge rapide'
FROM public.structures s
WHERE NOT EXISTS (SELECT 1 FROM public.queue_priority_levels WHERE structure_id = s.id AND level = 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.queue_priority_levels (structure_id, level, label, color, description)
SELECT s.id, 3, 'Prioritaire', '#EAB308', 'Patient prioritaire (grossesse, handicap, etc.)'
FROM public.structures s
WHERE NOT EXISTS (SELECT 1 FROM public.queue_priority_levels WHERE structure_id = s.id AND level = 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.queue_priority_levels (structure_id, level, label, color, description)
SELECT s.id, 4, 'Normal', '#22C55E', 'Consultation standard'
FROM public.structures s
WHERE NOT EXISTS (SELECT 1 FROM public.queue_priority_levels WHERE structure_id = s.id AND level = 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.queue_priority_levels (structure_id, level, label, color, description)
SELECT s.id, 5, 'Différé', '#6B7280', 'Peut attendre - basse priorité'
FROM public.structures s
WHERE NOT EXISTS (SELECT 1 FROM public.queue_priority_levels WHERE structure_id = s.id AND level = 5)
ON CONFLICT DO NOTHING;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_structure_settings_updated_at
  BEFORE UPDATE ON public.structure_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_structure_opening_hours_updated_at
  BEFORE UPDATE ON public.structure_opening_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioner_schedules_updated_at
  BEFORE UPDATE ON public.practitioner_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioner_absences_updated_at
  BEFORE UPDATE ON public.practitioner_absences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_priority_levels_updated_at
  BEFORE UPDATE ON public.queue_priority_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
