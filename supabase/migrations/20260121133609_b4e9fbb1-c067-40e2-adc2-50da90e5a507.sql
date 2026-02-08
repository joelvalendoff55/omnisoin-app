-- SPRINT 1A: Statuts juridiques stricts avec transitions contrôlées

-- 1. Create the strict ENUM type for patient presence status
CREATE TYPE patient_presence_status AS ENUM (
  'present',           -- Patient enregistré, arrivée confirmée
  'waiting',           -- En attente dans la salle d'attente
  'called',            -- Appelé par l'équipe
  'in_consultation',   -- En consultation avec médecin/assistante
  'awaiting_exam',     -- En attente d'examen complémentaire
  'completed',         -- Consultation terminée (pré-clôture)
  'closed',            -- Clôture administrative validée
  'no_show',           -- Absence non justifiée
  'cancelled'          -- Annulation justifiée
);

-- Add comment to document the ENUM
COMMENT ON TYPE patient_presence_status IS 'Statuts juridiques stricts pour le parcours patient en salle d''attente';

-- 2. Add status tracking columns to patient_queue
ALTER TABLE public.patient_queue
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS status_changed_by uuid,
ADD COLUMN IF NOT EXISTS previous_status text,
ADD COLUMN IF NOT EXISTS status_change_reason text;

-- Add comments for new columns
COMMENT ON COLUMN public.patient_queue.status_changed_at IS 'Horodatage du dernier changement de statut';
COMMENT ON COLUMN public.patient_queue.status_changed_by IS 'Utilisateur ayant effectué le changement de statut';
COMMENT ON COLUMN public.patient_queue.previous_status IS 'Statut précédent pour traçabilité';
COMMENT ON COLUMN public.patient_queue.status_change_reason IS 'Raison du changement de statut (obligatoire pour certaines transitions)';

-- 3. Create the status transitions table
CREATE TABLE IF NOT EXISTS public.patient_status_transitions (
  from_status text NOT NULL,
  to_status text NOT NULL,
  requires_reason boolean DEFAULT false,
  requires_billing boolean DEFAULT false,
  is_reversible boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (from_status, to_status)
);

-- Enable RLS on transitions table
ALTER TABLE public.patient_status_transitions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow all authenticated users to read transitions (reference data)
CREATE POLICY "transitions_select_authenticated" ON public.patient_status_transitions
FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS policy: Only super admins can modify transitions
CREATE POLICY "transitions_modify_superadmin" ON public.patient_status_transitions
FOR ALL USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

COMMENT ON TABLE public.patient_status_transitions IS 'Table de référence définissant les transitions de statut autorisées pour le parcours patient';

-- 4. Insert allowed transitions
INSERT INTO public.patient_status_transitions (from_status, to_status, requires_reason, requires_billing, is_reversible, description) VALUES
-- From 'present' (initial registration)
('present', 'waiting', false, false, true, 'Patient passe en salle d''attente'),
('present', 'no_show', true, false, false, 'Patient ne s''est pas présenté après enregistrement'),
('present', 'cancelled', true, false, false, 'Enregistrement annulé'),

-- From 'waiting' (in waiting room)
('waiting', 'called', false, false, true, 'Patient appelé par l''équipe'),
('waiting', 'no_show', true, false, false, 'Patient a quitté sans prévenir'),
('waiting', 'cancelled', true, false, false, 'Patient annule sa consultation'),

-- From 'called' (patient called)
('called', 'in_consultation', false, false, true, 'Patient entre en consultation'),
('called', 'waiting', false, false, true, 'Patient retourne en salle d''attente'),
('called', 'no_show', true, false, false, 'Patient ne répond pas à l''appel'),

-- From 'in_consultation' (in consultation)
('in_consultation', 'awaiting_exam', false, false, true, 'Patient en attente d''examen complémentaire'),
('in_consultation', 'completed', false, false, false, 'Consultation terminée'),
('in_consultation', 'cancelled', true, false, false, 'Consultation interrompue'),

-- From 'awaiting_exam' (waiting for exam)
('awaiting_exam', 'in_consultation', false, false, true, 'Retour en consultation après examen'),
('awaiting_exam', 'completed', false, false, false, 'Parcours terminé après examen'),

-- From 'completed' (pre-closure) - REQUIRES BILLING
('completed', 'closed', false, true, false, 'Clôture administrative validée')

-- 'closed' is terminal - no transitions allowed
-- 'no_show' and 'cancelled' are also terminal states
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 5. Create function to validate status transitions
CREATE OR REPLACE FUNCTION public.validate_status_transition(
  p_current_status text,
  p_new_status text,
  p_billing_status text,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transition RECORD;
BEGIN
  -- Same status is always allowed (no-op)
  IF p_current_status = p_new_status THEN
    RETURN true;
  END IF;
  
  -- Check if transition exists
  SELECT * INTO v_transition
  FROM public.patient_status_transitions
  WHERE from_status = p_current_status AND to_status = p_new_status;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERREUR JURIDIQUE: Transition de statut non autorisée: % → %. Cette transition viole le protocole de suivi patient.', 
      p_current_status, p_new_status;
  END IF;
  
  -- Check if reason is required
  IF v_transition.requires_reason AND (p_reason IS NULL OR p_reason = '') THEN
    RAISE EXCEPTION 'ERREUR JURIDIQUE: La transition % → % nécessite une justification obligatoire.', 
      p_current_status, p_new_status;
  END IF;
  
  -- Check if billing is required
  IF v_transition.requires_billing AND p_billing_status NOT IN ('completed', 'waived', 'not_required') THEN
    RAISE EXCEPTION 'ERREUR JURIDIQUE: La transition vers ''%'' nécessite une facturation complète (statut actuel: %). Le patient ne peut pas être clôturé sans validation administrative.', 
      p_new_status, p_billing_status;
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.validate_status_transition IS 'Valide qu''une transition de statut patient est autorisée selon les règles juridiques';

-- 6. Create trigger function to enforce status transitions
CREATE OR REPLACE FUNCTION public.enforce_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
BEGIN
  -- Get old and new status values
  v_old_status := COALESCE(OLD.status, 'waiting');
  v_new_status := COALESCE(NEW.status, 'waiting');
  
  -- If status is changing, validate the transition
  IF v_old_status IS DISTINCT FROM v_new_status THEN
    -- Validate the transition (will raise exception if invalid)
    PERFORM public.validate_status_transition(
      v_old_status,
      v_new_status,
      COALESCE(NEW.billing_status, 'pending'),
      NEW.status_change_reason
    );
    
    -- Auto-update tracking fields
    NEW.status_changed_at := now();
    NEW.previous_status := v_old_status;
    
    -- Set status_changed_by to current user if not already set
    IF NEW.status_changed_by IS NULL THEN
      NEW.status_changed_by := auth.uid();
    END IF;
    
    -- Log the status change
    INSERT INTO public.activity_logs (
      structure_id,
      actor_user_id,
      patient_id,
      action,
      metadata
    ) VALUES (
      NEW.structure_id,
      COALESCE(auth.uid(), NEW.status_changed_by),
      NEW.patient_id,
      'patient_status_changed',
      jsonb_build_object(
        'queue_entry_id', NEW.id,
        'from_status', v_old_status,
        'to_status', v_new_status,
        'reason', NEW.status_change_reason,
        'billing_status', NEW.billing_status
      )
    );
    
    -- Auto-set closed_at when transitioning to 'closed'
    IF v_new_status = 'closed' AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
      NEW.closed_by := COALESCE(NEW.closed_by, auth.uid());
    END IF;
    
    -- Auto-set completed_at for terminal states
    IF v_new_status IN ('completed', 'closed', 'no_show', 'cancelled') AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_status_transitions IS 'Trigger function qui valide et trace tous les changements de statut patient';

-- 7. Create the trigger
DROP TRIGGER IF EXISTS enforce_status_transitions ON public.patient_queue;
CREATE TRIGGER enforce_status_transitions
  BEFORE UPDATE ON public.patient_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_status_transitions();

-- 8. Create helper function to get allowed next statuses
CREATE OR REPLACE FUNCTION public.get_allowed_next_statuses(p_current_status text)
RETURNS TABLE (
  next_status text,
  requires_reason boolean,
  requires_billing boolean,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    to_status,
    requires_reason,
    requires_billing,
    description
  FROM public.patient_status_transitions
  WHERE from_status = p_current_status
  ORDER BY to_status;
$$;

COMMENT ON FUNCTION public.get_allowed_next_statuses IS 'Retourne les statuts suivants autorisés pour un statut donné';

-- 9. Create function to safely change patient status
CREATE OR REPLACE FUNCTION public.change_patient_queue_status(
  p_queue_entry_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_entry RECORD;
BEGIN
  -- Get current entry
  SELECT * INTO v_entry FROM public.patient_queue WHERE id = p_queue_entry_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrée de file d''attente non trouvée: %', p_queue_entry_id;
  END IF;
  
  -- Update the status (trigger will validate and track)
  UPDATE public.patient_queue
  SET 
    status = p_new_status,
    status_change_reason = p_reason,
    status_changed_by = auth.uid(),
    updated_at = now()
  WHERE id = p_queue_entry_id
  RETURNING json_build_object(
    'id', id,
    'status', status,
    'previous_status', previous_status,
    'status_changed_at', status_changed_at,
    'status_changed_by', status_changed_by
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.change_patient_queue_status IS 'Change le statut d''un patient de manière sécurisée avec validation des transitions';

-- 10. Migrate existing data to use 'in_consultation' instead of 'in_progress'
UPDATE public.patient_queue
SET status = 'in_consultation'
WHERE status = 'in_progress';

-- 11. Add index for status queries
CREATE INDEX IF NOT EXISTS idx_patient_queue_status_changed_at 
ON public.patient_queue(status_changed_at DESC);

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_status_transition TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_allowed_next_statuses TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_patient_queue_status TO authenticated;