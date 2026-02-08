-- Ajouter les colonnes manquantes pour RLS et multi-tenant
ALTER TABLE public.transcript_summaries
ADD COLUMN structure_id UUID REFERENCES public.structures(id),
ADD COLUMN patient_id UUID REFERENCES public.patients(id),
ADD COLUMN generated_by UUID;

-- Ajouter contrainte unique pour éviter les duplicates
ALTER TABLE public.transcript_summaries
ADD CONSTRAINT transcript_summaries_transcript_id_key UNIQUE (transcript_id);

-- Mettre à jour les politiques RLS pour utiliser les nouvelles colonnes
DROP POLICY IF EXISTS "Users can insert summaries for accessible transcripts" ON public.transcript_summaries;

CREATE POLICY "Users can insert summaries for accessible transcripts"
  ON public.transcript_summaries FOR INSERT
  WITH CHECK (structure_id = public.get_user_structure_id(auth.uid()));