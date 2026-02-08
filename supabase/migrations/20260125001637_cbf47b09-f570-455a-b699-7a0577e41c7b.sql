-- Create push_subscriptions table to store browser push tokens
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  structure_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "push_subscriptions_select_own"
ON public.push_subscriptions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (user_id = auth.uid() AND structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "push_subscriptions_update_own"
ON public.push_subscriptions
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own"
ON public.push_subscriptions
FOR DELETE
USING (user_id = auth.uid());

-- Admin can view all subscriptions in their structure for sending
CREATE POLICY "push_subscriptions_select_structure_admin"
ON public.push_subscriptions
FOR SELECT
USING (
  structure_id = get_user_structure_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
);

-- Index for faster queries
CREATE INDEX idx_push_subscriptions_structure_active 
ON public.push_subscriptions(structure_id, is_active);

CREATE INDEX idx_push_subscriptions_user 
ON public.push_subscriptions(user_id);