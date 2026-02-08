
-- Drop existing category check constraint and add 'medecin' category
ALTER TABLE public.system_prompts DROP CONSTRAINT IF EXISTS system_prompts_category_check;

ALTER TABLE public.system_prompts ADD CONSTRAINT system_prompts_category_check 
CHECK (category IN ('assistant', 'summary', 'transcription', 'analysis', 'other', 'clinical_suggestions', 'ocr_extraction', 'stt_processing', 'summary_generator', 'transcript_cleaner', 'assistant_system', 'medecin'));
