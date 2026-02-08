
-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  specialty TEXT,
  professional_id TEXT,
  is_available BOOLEAN DEFAULT true,
  works_pdsa BOOLEAN DEFAULT false,
  max_patients_per_day INTEGER,
  professional_phone TEXT,
  professional_email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, structure_id)
);

-- Create indexes
CREATE INDEX idx_team_members_structure ON public.team_members(structure_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing helper functions with auth.uid())
CREATE POLICY "team_members_select_same_structure" 
ON public.team_members FOR SELECT 
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "team_members_insert_admin_coordinator" 
ON public.team_members FOR INSERT 
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
);

CREATE POLICY "team_members_update" 
ON public.team_members FOR UPDATE 
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator') OR user_id = auth.uid())
);

CREATE POLICY "team_members_delete_admin" 
ON public.team_members FOR DELETE 
USING (structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Activity log trigger function
CREATE OR REPLACE FUNCTION public.log_team_member_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (structure_id, actor_user_id, action, metadata)
    VALUES (NEW.structure_id, auth.uid(), 'team_member_created', jsonb_build_object('team_member_id', NEW.id, 'job_title', NEW.job_title));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (structure_id, actor_user_id, action, metadata)
    VALUES (NEW.structure_id, auth.uid(), 'team_member_updated', jsonb_build_object('team_member_id', NEW.id, 'job_title', NEW.job_title));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (structure_id, actor_user_id, action, metadata)
    VALUES (OLD.structure_id, auth.uid(), 'team_member_deleted', jsonb_build_object('team_member_id', OLD.id, 'job_title', OLD.job_title));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach activity log trigger
CREATE TRIGGER team_member_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.log_team_member_activity();
