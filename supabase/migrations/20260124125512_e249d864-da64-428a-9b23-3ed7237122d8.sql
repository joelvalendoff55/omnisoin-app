-- Create chatbot_settings table for structure-specific chatbot customization
CREATE TABLE public.chatbot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  system_prompt TEXT,
  welcome_message TEXT DEFAULT 'Bonjour ! 👋 Je suis OmniSoin Assist, votre assistant virtuel. Comment puis-je vous aider aujourd''hui ?',
  quick_questions JSONB DEFAULT '[
    {"label": "Prendre RDV", "icon": "calendar", "message": "Comment puis-je prendre un rendez-vous ?"},
    {"label": "Mes documents", "icon": "file-text", "message": "Comment accéder à mes documents médicaux ?"},
    {"label": "Contacter équipe", "icon": "message-square", "message": "Comment contacter mon médecin ?"},
    {"label": "Horaires", "icon": "help-circle", "message": "Quels sont les horaires d''ouverture ?"}
  ]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(structure_id)
);

-- Enable RLS
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage their structure's settings
CREATE POLICY "Admins can view their structure chatbot settings"
  ON public.chatbot_settings
  FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

CREATE POLICY "Admins can insert their structure chatbot settings"
  ON public.chatbot_settings
  FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND structure_id = chatbot_settings.structure_id 
      AND role = 'admin'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update their structure chatbot settings"
  ON public.chatbot_settings
  FOR UPDATE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND structure_id = chatbot_settings.structure_id 
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Function to get chatbot settings for a patient's structure (SECURITY DEFINER for patient portal access)
CREATE OR REPLACE FUNCTION public.get_patient_chatbot_settings(_patient_id uuid)
RETURNS TABLE(
  system_prompt TEXT,
  welcome_message TEXT,
  quick_questions JSONB,
  is_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_structure_id UUID;
BEGIN
  -- Get patient's structure_id
  SELECT p.structure_id INTO v_structure_id
  FROM patients p
  WHERE p.id = _patient_id;
  
  IF v_structure_id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::JSONB, false;
    RETURN;
  END IF;
  
  -- Return settings or defaults
  RETURN QUERY
  SELECT 
    cs.system_prompt,
    COALESCE(cs.welcome_message, 'Bonjour ! 👋 Je suis OmniSoin Assist, votre assistant virtuel. Comment puis-je vous aider aujourd''hui ?'),
    COALESCE(cs.quick_questions, '[
      {"label": "Prendre RDV", "icon": "calendar", "message": "Comment puis-je prendre un rendez-vous ?"},
      {"label": "Mes documents", "icon": "file-text", "message": "Comment accéder à mes documents médicaux ?"},
      {"label": "Contacter équipe", "icon": "message-square", "message": "Comment contacter mon médecin ?"},
      {"label": "Horaires", "icon": "help-circle", "message": "Quels sont les horaires d''ouverture ?"}
    ]'::jsonb),
    COALESCE(cs.is_enabled, true)
  FROM chatbot_settings cs
  WHERE cs.structure_id = v_structure_id;
  
  -- If no settings exist, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::TEXT,
      'Bonjour ! 👋 Je suis OmniSoin Assist, votre assistant virtuel. Comment puis-je vous aider aujourd''hui ?'::TEXT,
      '[
        {"label": "Prendre RDV", "icon": "calendar", "message": "Comment puis-je prendre un rendez-vous ?"},
        {"label": "Mes documents", "icon": "file-text", "message": "Comment accéder à mes documents médicaux ?"},
        {"label": "Contacter équipe", "icon": "message-square", "message": "Comment contacter mon médecin ?"},
        {"label": "Horaires", "icon": "help-circle", "message": "Quels sont les horaires d''ouverture ?"}
      ]'::jsonb,
      true;
  END IF;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_chatbot_settings_updated_at
  BEFORE UPDATE ON public.chatbot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();