-- Create patient_queue table
CREATE TABLE IF NOT EXISTS public.patient_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.team_members(id),
  priority INTEGER DEFAULT 3, -- 1=urgent, 2=prioritaire, 3=normal
  status TEXT DEFAULT 'waiting', -- waiting, in_progress, completed, cancelled
  arrival_time TIMESTAMPTZ DEFAULT now(),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_queue_structure_status ON public.patient_queue(structure_id, status);
CREATE INDEX idx_queue_assigned ON public.patient_queue(assigned_to);

-- Enable RLS
ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "queue_select_same_structure" ON public.patient_queue 
FOR SELECT USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "queue_insert_staff" ON public.patient_queue 
FOR INSERT WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "queue_update_staff" ON public.patient_queue 
FOR UPDATE USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "queue_delete_admin" ON public.patient_queue 
FOR DELETE USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_queue;

-- Updated_at trigger
CREATE TRIGGER update_patient_queue_updated_at
  BEFORE UPDATE ON public.patient_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();