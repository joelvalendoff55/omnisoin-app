-- Create notification_logs table for delivery history
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  subject TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "notification_logs_select_admin_coordinator"
ON public.notification_logs
FOR SELECT
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
);

CREATE POLICY "notification_logs_insert_authenticated"
ON public.notification_logs
FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

-- No update or delete - logs are immutable
CREATE POLICY "notification_logs_no_update"
ON public.notification_logs
FOR UPDATE
USING (false);

CREATE POLICY "notification_logs_no_delete"
ON public.notification_logs
FOR DELETE
USING (false);

-- Index for faster queries
CREATE INDEX idx_notification_logs_structure_created 
ON public.notification_logs(structure_id, created_at DESC);

CREATE INDEX idx_notification_logs_status 
ON public.notification_logs(status);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;