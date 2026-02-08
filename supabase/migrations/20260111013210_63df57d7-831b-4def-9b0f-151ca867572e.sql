-- Table pour stocker les résumés IA des transcriptions
CREATE TABLE public.transcript_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.patient_transcripts(id) ON DELETE CASCADE,
  summary_text TEXT,
  model_used TEXT,
  status TEXT NOT NULL DEFAULT 'generating' 
    CHECK (status IN ('generating', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour lookup rapide
CREATE INDEX idx_transcript_summaries_transcript ON public.transcript_summaries(transcript_id);
CREATE INDEX idx_transcript_summaries_status ON public.transcript_summaries(status);

-- RLS (même logique que patient_transcripts via can_access_patient)
ALTER TABLE public.transcript_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT: Accès via le transcript parent
CREATE POLICY "Users can view summaries for accessible transcripts"
  ON public.transcript_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_transcripts pt
      WHERE pt.id = transcript_summaries.transcript_id
      AND public.can_access_patient(auth.uid(), pt.patient_id)
    )
  );

-- INSERT: Structure de l'utilisateur (via transcript)
CREATE POLICY "Users can insert summaries for accessible transcripts"
  ON public.transcript_summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_transcripts pt
      WHERE pt.id = transcript_summaries.transcript_id
      AND pt.structure_id = public.get_user_structure_id(auth.uid())
    )
  );

-- UPDATE: Accès via transcript
CREATE POLICY "Users can update summaries for accessible transcripts"
  ON public.transcript_summaries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_transcripts pt
      WHERE pt.id = transcript_summaries.transcript_id
      AND public.can_access_patient(auth.uid(), pt.patient_id)
    )
  );

-- DELETE: Admin uniquement
CREATE POLICY "Admins can delete summaries"
  ON public.transcript_summaries FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime pour les mises à jour de statut
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcript_summaries;