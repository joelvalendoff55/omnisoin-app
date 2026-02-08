-- First, drop the old constraint and add a new one that includes clinical_suggestions
ALTER TABLE public.system_prompts 
  DROP CONSTRAINT IF EXISTS system_prompts_category_check;

ALTER TABLE public.system_prompts 
  ADD CONSTRAINT system_prompts_category_check 
  CHECK (category = ANY (ARRAY['assistant', 'summary', 'transcription', 'analysis', 'other', 'clinical_suggestions', 'ocr_extraction', 'stt_processing']));