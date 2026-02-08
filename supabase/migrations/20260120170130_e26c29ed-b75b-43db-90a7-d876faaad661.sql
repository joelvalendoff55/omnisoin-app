-- Table des prompts système
CREATE TABLE IF NOT EXISTS public.system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('assistant', 'summary', 'transcription', 'analysis', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des versions de prompts
CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.system_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(prompt_id, version)
);

-- Table des tests de prompts
CREATE TABLE IF NOT EXISTS public.prompt_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT,
  actual_output TEXT,
  passed BOOLEAN,
  tested_by UUID NOT NULL,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Seuls les prompt_admin et admin peuvent voir/modifier
CREATE POLICY "Prompt admins can view prompts" ON public.system_prompts
  FOR SELECT USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can insert prompts" ON public.system_prompts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can update prompts" ON public.system_prompts
  FOR UPDATE USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can delete prompts" ON public.system_prompts
  FOR DELETE USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can view versions" ON public.prompt_versions
  FOR SELECT USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can insert versions" ON public.prompt_versions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can update versions" ON public.prompt_versions
  FOR UPDATE USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can delete versions" ON public.prompt_versions
  FOR DELETE USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can view tests" ON public.prompt_tests
  FOR SELECT USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can insert tests" ON public.prompt_tests
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can update tests" ON public.prompt_tests
  FOR UPDATE USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Prompt admins can delete tests" ON public.prompt_tests
  FOR DELETE USING (has_role(auth.uid(), 'prompt_admin') OR has_role(auth.uid(), 'admin'));

CREATE INDEX idx_versions_prompt ON public.prompt_versions(prompt_id);
CREATE INDEX idx_versions_published ON public.prompt_versions(prompt_id, is_published) WHERE is_published = true;
CREATE INDEX idx_tests_version ON public.prompt_tests(version_id);

-- Trigger pour updated_at
CREATE TRIGGER update_system_prompts_updated_at
  BEFORE UPDATE ON public.system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed des prompts système par défaut
INSERT INTO public.system_prompts (name, display_name, description, category) VALUES
  ('assistant_system', 'Assistant médical', 'Prompt système pour l''assistant IA non-injonctif', 'assistant'),
  ('summary_generator', 'Générateur de synthèses', 'Génère des synthèses de consultation structurées', 'summary'),
  ('transcript_cleaner', 'Nettoyeur de transcripts', 'Nettoie et structure les transcriptions STT', 'transcription')
ON CONFLICT (name) DO NOTHING;