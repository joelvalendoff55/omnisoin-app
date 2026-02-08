-- Table pour les observations libres de consultation (accessible à tous les métiers)
CREATE TABLE public.consultation_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_consultation_observations_patient ON public.consultation_observations(patient_id);
CREATE INDEX idx_consultation_observations_consultation ON public.consultation_observations(consultation_id);
CREATE INDEX idx_consultation_observations_structure ON public.consultation_observations(structure_id);

-- Enable RLS
ALTER TABLE public.consultation_observations ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: tous les membres de la structure peuvent lire
CREATE POLICY "consultation_observations_select"
ON public.consultation_observations
FOR SELECT
TO authenticated
USING (
  structure_id = get_user_structure_id(auth.uid())
);

-- Politique INSERT: tous les métiers peuvent ajouter des observations
CREATE POLICY "consultation_observations_insert"
ON public.consultation_observations
FOR INSERT
TO authenticated
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid())
  AND author_id = auth.uid()
);

-- Politique UPDATE: seul l'auteur peut modifier son observation
CREATE POLICY "consultation_observations_update"
ON public.consultation_observations
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND structure_id = get_user_structure_id(auth.uid())
);

-- Politique DELETE: seul l'auteur ou admin peut supprimer
CREATE POLICY "consultation_observations_delete"
ON public.consultation_observations
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger pour updated_at
CREATE TRIGGER update_consultation_observations_updated_at
BEFORE UPDATE ON public.consultation_observations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime pour les observations
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_observations;