-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  patient_id UUID REFERENCES public.patients(id),
  assigned_to UUID REFERENCES public.team_members(id),
  created_by UUID NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  category TEXT, -- administrative, clinical, followup, other
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tasks_structure ON public.tasks(structure_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_patient ON public.tasks(patient_id);
CREATE INDEX idx_tasks_status ON public.tasks(structure_id, status);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tasks_select_same_structure" ON public.tasks 
FOR SELECT USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "tasks_insert_staff" ON public.tasks 
FOR INSERT WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "tasks_update_staff" ON public.tasks 
FOR UPDATE USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "tasks_delete_creator_admin" ON public.tasks 
FOR DELETE USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Updated_at trigger
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();