-- Table des conversations avec l'assistant
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  transcript_id UUID REFERENCES public.patient_transcripts(id) ON DELETE SET NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('general', 'consultation', 'transcript', 'summary')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.assistant_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create conversations" ON public.assistant_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() AND structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Users can update their own conversations" ON public.assistant_conversations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations" ON public.assistant_conversations
  FOR DELETE USING (user_id = auth.uid());

-- Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.assistant_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assistant_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can create messages in their conversations" ON public.assistant_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.assistant_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_assistant_conversations_user ON public.assistant_conversations(user_id);
CREATE INDEX idx_assistant_conversations_patient ON public.assistant_conversations(patient_id);
CREATE INDEX idx_assistant_messages_conversation ON public.assistant_messages(conversation_id);

-- Trigger for updated_at
CREATE TRIGGER update_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();