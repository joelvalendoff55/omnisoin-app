-- Create aci_indicators table for tracking ACI objectives and progress
CREATE TABLE public.aci_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('acces_soins', 'travail_equipe', 'systeme_info')),
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'late')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rcp_meetings table for RCP meetings
CREATE TABLE public.rcp_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  participants UUID[] DEFAULT '{}',
  patient_ids UUID[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.aci_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcp_meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for aci_indicators
CREATE POLICY "aci_indicators_select_same_structure" 
ON public.aci_indicators 
FOR SELECT 
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "aci_indicators_insert_coordinator_admin" 
ON public.aci_indicators 
FOR INSERT 
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
);

CREATE POLICY "aci_indicators_update_coordinator_admin" 
ON public.aci_indicators 
FOR UPDATE 
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
);

CREATE POLICY "aci_indicators_delete_admin" 
ON public.aci_indicators 
FOR DELETE 
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

-- RLS policies for rcp_meetings
CREATE POLICY "rcp_meetings_select_same_structure" 
ON public.rcp_meetings 
FOR SELECT 
USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "rcp_meetings_insert_coordinator_admin" 
ON public.rcp_meetings 
FOR INSERT 
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
  AND created_by = auth.uid()
);

CREATE POLICY "rcp_meetings_update_coordinator_admin" 
ON public.rcp_meetings 
FOR UPDATE 
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
);

CREATE POLICY "rcp_meetings_delete_admin" 
ON public.rcp_meetings 
FOR DELETE 
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

-- Create trigger for updated_at on aci_indicators
CREATE TRIGGER update_aci_indicators_updated_at
BEFORE UPDATE ON public.aci_indicators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on rcp_meetings
CREATE TRIGGER update_rcp_meetings_updated_at
BEFORE UPDATE ON public.rcp_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.aci_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rcp_meetings;