-- Table teams
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(structure_id, name)
);

-- Table team_memberships (linking users to teams)
CREATE TABLE public.team_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Table notification_recipients
CREATE TABLE public.notification_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL CHECK (event_key IN ('new_appointment','cancel_appointment','no_show','urgent_alert','daily_summary')),
  target_type TEXT NOT NULL CHECK (target_type IN ('structure','team','user')),
  target_id UUID,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_key, target_type, target_id, channel, structure_id)
);

-- Indexes
CREATE INDEX idx_teams_structure ON public.teams(structure_id);
CREATE INDEX idx_teams_active ON public.teams(structure_id, is_active);
CREATE INDEX idx_team_memberships_team ON public.team_memberships(team_id);
CREATE INDEX idx_team_memberships_user ON public.team_memberships(user_id);
CREATE INDEX idx_notification_recipients_structure ON public.notification_recipients(structure_id);
CREATE INDEX idx_notification_recipients_event ON public.notification_recipients(structure_id, event_key);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their structure" ON public.teams 
FOR SELECT USING (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admins can insert teams" ON public.teams 
FOR INSERT WITH CHECK (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true)
);

CREATE POLICY "Admins can update teams" ON public.teams 
FOR UPDATE USING (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true)
);

CREATE POLICY "Admins can delete teams" ON public.teams 
FOR DELETE USING (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true)
);

-- RLS Policies for team_memberships
CREATE POLICY "Users can view team memberships in their structure" ON public.team_memberships 
FOR SELECT USING (
  team_id IN (SELECT id FROM public.teams WHERE structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true))
);

CREATE POLICY "Admins can insert team memberships" ON public.team_memberships 
FOR INSERT WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true))
);

CREATE POLICY "Admins can update team memberships" ON public.team_memberships 
FOR UPDATE USING (
  team_id IN (SELECT id FROM public.teams WHERE structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true))
);

CREATE POLICY "Admins can delete team memberships" ON public.team_memberships 
FOR DELETE USING (
  team_id IN (SELECT id FROM public.teams WHERE structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true))
);

-- RLS Policies for notification_recipients
CREATE POLICY "Users can view notification recipients in their structure" ON public.notification_recipients 
FOR SELECT USING (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admins can insert notification recipients" ON public.notification_recipients 
FOR INSERT WITH CHECK (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true)
);

CREATE POLICY "Admins can update notification recipients" ON public.notification_recipients 
FOR UPDATE USING (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true)
);

CREATE POLICY "Admins can delete notification recipients" ON public.notification_recipients 
FOR DELETE USING (
  structure_id IN (SELECT structure_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator') AND is_active = true)
);

-- Trigger for updated_at on teams
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();