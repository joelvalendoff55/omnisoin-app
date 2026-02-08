
-- =====================================================
-- ÉTAPE 2: Hub Épisode - Table pivot encounters
-- =====================================================

-- 1. Créer les ENUMs pour le mode et le statut
CREATE TYPE public.encounter_mode AS ENUM ('solo', 'assisted');

CREATE TYPE public.encounter_status AS ENUM (
  'created',
  'preconsult_in_progress',
  'preconsult_ready',
  'consultation_in_progress',
  'completed',
  'cancelled'
);

-- 2. Créer la table pivot encounters
CREATE TABLE public.encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Liens fondamentaux
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  structure_id uuid NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  
  -- Mode de fonctionnement
  mode encounter_mode NOT NULL DEFAULT 'solo',
  
  -- Statut de l'épisode
  status encounter_status NOT NULL DEFAULT 'created',
  
  -- Liens vers les tables existantes (backward compatible)
  queue_entry_id uuid REFERENCES public.patient_queue(id) ON DELETE SET NULL,
  preconsultation_id uuid REFERENCES public.preconsultations(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  
  -- Assignations
  assigned_practitioner_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  assigned_assistant_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  
  -- Timestamps du workflow
  started_at timestamptz NOT NULL DEFAULT now(),
  preconsult_completed_at timestamptz,
  consultation_started_at timestamptz,
  completed_at timestamptz,
  
  -- Traçabilité
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Métadonnées optionnelles
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 3. Index pour les requêtes fréquentes
CREATE INDEX idx_encounters_patient_id ON public.encounters(patient_id);
CREATE INDEX idx_encounters_structure_id ON public.encounters(structure_id);
CREATE INDEX idx_encounters_status ON public.encounters(status);
CREATE INDEX idx_encounters_queue_entry_id ON public.encounters(queue_entry_id);
CREATE INDEX idx_encounters_consultation_id ON public.encounters(consultation_id);
CREATE INDEX idx_encounters_assigned_practitioner ON public.encounters(assigned_practitioner_id);
CREATE INDEX idx_encounters_started_at ON public.encounters(started_at DESC);

-- Index composite pour les requêtes courantes
CREATE INDEX idx_encounters_structure_status ON public.encounters(structure_id, status);
CREATE INDEX idx_encounters_structure_date ON public.encounters(structure_id, started_at DESC);

-- 4. Trigger pour updated_at
CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON public.encounters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

-- 6. Politiques RLS

-- Lecture: membres de la structure
CREATE POLICY "encounters_select_structure_members"
ON public.encounters
FOR SELECT
TO authenticated
USING (
  structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
);

-- Insertion: médecins, assistants, coordinateurs, admins
CREATE POLICY "encounters_insert_authorized"
ON public.encounters
FOR INSERT
TO authenticated
WITH CHECK (
  structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'practitioner'::app_role) OR
    public.has_role(auth.uid(), 'assistant'::app_role) OR
    public.has_role(auth.uid(), 'coordinator'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'nurse'::app_role) OR
    public.has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- Mise à jour: selon le rôle et le statut
CREATE POLICY "encounters_update_authorized"
ON public.encounters
FOR UPDATE
TO authenticated
USING (
  structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
)
WITH CHECK (
  structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'practitioner'::app_role) OR
    public.has_role(auth.uid(), 'assistant'::app_role) OR
    public.has_role(auth.uid(), 'coordinator'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'nurse'::app_role) OR
    public.has_role(auth.uid(), 'ipa'::app_role)
  )
);

-- Suppression: admins et coordinateurs uniquement
CREATE POLICY "encounters_delete_admin_only"
ON public.encounters
FOR DELETE
TO authenticated
USING (
  structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'coordinator'::app_role)
  )
);

-- 7. Table d'historique des transitions de statut (traçabilité)
CREATE TABLE public.encounter_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  previous_status encounter_status,
  new_status encounter_status NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_encounter_status_history_encounter ON public.encounter_status_history(encounter_id);
CREATE INDEX idx_encounter_status_history_changed_at ON public.encounter_status_history(changed_at DESC);

ALTER TABLE public.encounter_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encounter_status_history_select"
ON public.encounter_status_history
FOR SELECT
TO authenticated
USING (
  encounter_id IN (
    SELECT id FROM public.encounters 
    WHERE structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
  )
);

CREATE POLICY "encounter_status_history_insert"
ON public.encounter_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  encounter_id IN (
    SELECT id FROM public.encounters 
    WHERE structure_id IN (SELECT public.get_user_structure_ids(auth.uid()))
  )
);

-- 8. Trigger pour logger automatiquement les changements de statut
CREATE OR REPLACE FUNCTION public.log_encounter_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.encounter_status_history (
      encounter_id,
      previous_status,
      new_status,
      changed_by,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.updated_by, auth.uid()),
      jsonb_build_object(
        'mode', NEW.mode,
        'patient_id', NEW.patient_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_encounter_status_change
  AFTER UPDATE ON public.encounters
  FOR EACH ROW
  EXECUTE FUNCTION public.log_encounter_status_change();

-- 9. Fonction helper pour créer un épisode depuis la file d'attente
CREATE OR REPLACE FUNCTION public.create_encounter_from_queue(
  _queue_entry_id uuid,
  _mode encounter_mode DEFAULT 'solo'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _encounter_id uuid;
  _queue_entry record;
BEGIN
  -- Récupérer les infos de la file d'attente
  SELECT * INTO _queue_entry
  FROM public.patient_queue
  WHERE id = _queue_entry_id;
  
  IF _queue_entry IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found';
  END IF;
  
  -- Créer l'épisode
  INSERT INTO public.encounters (
    patient_id,
    structure_id,
    mode,
    status,
    queue_entry_id,
    assigned_practitioner_id,
    created_by
  ) VALUES (
    _queue_entry.patient_id,
    _queue_entry.structure_id,
    _mode,
    CASE 
      WHEN _mode = 'assisted' THEN 'preconsult_in_progress'::encounter_status
      ELSE 'consultation_in_progress'::encounter_status
    END,
    _queue_entry_id,
    _queue_entry.assigned_to,
    auth.uid()
  )
  RETURNING id INTO _encounter_id;
  
  RETURN _encounter_id;
END;
$$;

-- 10. Enable realtime pour encounters
ALTER PUBLICATION supabase_realtime ADD TABLE public.encounters;

-- 11. Commentaires pour documentation
COMMENT ON TABLE public.encounters IS 'Table pivot centrale du Hub Épisode - gère le workflow clinique complet';
COMMENT ON COLUMN public.encounters.mode IS 'Mode solo (médecin seul) ou assisted (avec pré-consultation assistante)';
COMMENT ON COLUMN public.encounters.status IS 'Statut actuel de l''épisode dans le workflow';
COMMENT ON TABLE public.encounter_status_history IS 'Historique complet des transitions de statut pour traçabilité';
