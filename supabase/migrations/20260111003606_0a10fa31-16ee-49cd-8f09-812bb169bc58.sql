-- Create inbox_messages table for WhatsApp-first triage
CREATE TABLE public.inbox_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'web')),
  external_conversation_id TEXT,
  external_message_id TEXT,
  sender_phone TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'document')),
  text_body TEXT,
  media_url TEXT,
  media_mime TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_inbox_messages_structure_id ON public.inbox_messages(structure_id);
CREATE INDEX idx_inbox_messages_patient_id ON public.inbox_messages(patient_id);
CREATE INDEX idx_inbox_messages_status ON public.inbox_messages(status);
CREATE INDEX idx_inbox_messages_created_at ON public.inbox_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: all users in the structure can view inbox messages
CREATE POLICY "Users can view inbox messages in their structure"
ON public.inbox_messages
FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

-- INSERT: admin, coordinator, assistant only
CREATE POLICY "Admin/coordinator/assistant can insert inbox messages"
ON public.inbox_messages
FOR INSERT
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'coordinator')
    OR has_role(auth.uid(), 'assistant')
  )
);

-- UPDATE: admin, coordinator, assistant only
CREATE POLICY "Admin/coordinator/assistant can update inbox messages"
ON public.inbox_messages
FOR UPDATE
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'coordinator')
    OR has_role(auth.uid(), 'assistant')
  )
);

-- DELETE: admin only
CREATE POLICY "Admin can delete inbox messages"
ON public.inbox_messages
FOR DELETE
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- Enable realtime for inbox_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;