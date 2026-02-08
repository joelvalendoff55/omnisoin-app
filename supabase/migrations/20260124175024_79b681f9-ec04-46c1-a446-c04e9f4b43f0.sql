-- Ajouter l'enum pour l'origine du patient
DO $$ BEGIN
  CREATE TYPE patient_origin AS ENUM ('spontanee', 'samu', 'hopital', 'confrere', 'autre');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ajouter l'enum pour le statut du dossier
DO $$ BEGIN
  CREATE TYPE patient_status AS ENUM ('actif', 'clos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ajouter les nouveaux champs à la table patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS origin patient_origin DEFAULT 'spontanee',
ADD COLUMN IF NOT EXISTS status patient_status DEFAULT 'actif' NOT NULL,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id);

-- Créer un index sur le statut pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- Créer un index sur l'origine pour les statistiques
CREATE INDEX IF NOT EXISTS idx_patients_origin ON public.patients(origin);

-- Commentaires pour documentation
COMMENT ON COLUMN public.patients.origin IS 'Origine du patient: spontanee, samu, hopital, confrere, autre';
COMMENT ON COLUMN public.patients.status IS 'Statut du dossier patient: actif ou clos';
COMMENT ON COLUMN public.patients.closed_at IS 'Date et heure de clôture du dossier';
COMMENT ON COLUMN public.patients.closed_by IS 'ID du médecin qui a clôturé le dossier';