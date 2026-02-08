-- Drop existing appointments table and recreate with new schema
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Create new appointments table with structure-based design
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id),
  practitioner_id UUID NOT NULL REFERENCES public.team_members(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  appointment_type TEXT DEFAULT 'consultation',
  is_pdsa BOOLEAN DEFAULT false,
  location TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_appointments_structure ON public.appointments(structure_id);
CREATE INDEX idx_appointments_practitioner ON public.appointments(practitioner_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_date ON public.appointments(structure_id, start_time);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "appointments_select_same_structure" ON public.appointments 
FOR SELECT USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "appointments_insert_staff" ON public.appointments 
FOR INSERT WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "appointments_update_staff" ON public.appointments 
FOR UPDATE USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "appointments_delete_creator_admin" ON public.appointments 
FOR DELETE USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Updated at trigger
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();