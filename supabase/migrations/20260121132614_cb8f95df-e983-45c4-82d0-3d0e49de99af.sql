-- =====================================================
-- SPRINT 1B : Verrou juridique anti-suppression patient
-- CRITIQUE pour conformité médico-légale
-- =====================================================

-- 1. Ajouter les colonnes de clôture et facturation à patient_queue
ALTER TABLE public.patient_queue
ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.consultations(id),
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'pending' CHECK (billing_status IN ('pending', 'completed', 'waived', 'not_required')),
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_by UUID,
ADD COLUMN IF NOT EXISTS closure_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_prevented BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Créer la fonction de logging pour tentatives de suppression illégales
CREATE OR REPLACE FUNCTION log_illegal_deletion_attempt(
  p_patient_queue_id UUID,
  p_patient_id UUID,
  p_structure_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_logs (
    structure_id,
    actor_user_id,
    patient_id,
    action,
    metadata
  ) VALUES (
    p_structure_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    p_patient_id,
    'ATTEMPTED_ILLEGAL_DELETION',
    jsonb_build_object(
      'severity', 'critical',
      'queue_entry_id', p_patient_queue_id,
      'timestamp', now(),
      'error', 'Tentative de suppression sans clôture administrative complète'
    )
  );
END;
$$;

-- 3. Créer le trigger BEFORE DELETE pour empêcher les suppressions non conformes
CREATE OR REPLACE FUNCTION prevent_patient_queue_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier les conditions de clôture
  IF OLD.billing_status NOT IN ('completed', 'waived', 'not_required') 
     OR OLD.closed_at IS NULL THEN
    
    -- Logger la tentative illégale
    PERFORM log_illegal_deletion_attempt(OLD.id, OLD.patient_id, OLD.structure_id);
    
    -- Lever l'exception juridique
    RAISE EXCEPTION 'ERREUR JURIDIQUE : Impossible de supprimer une entrée file d''attente sans clôture administrative et facturation complètes. Queue Entry ID: %, Patient ID: %, Billing Status: %, Closed At: %', 
      OLD.id, OLD.patient_id, OLD.billing_status, OLD.closed_at;
  END IF;
  
  -- Si toutes les conditions sont remplies, permettre la suppression
  RETURN OLD;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS prevent_patient_deletion ON public.patient_queue;

-- Créer le trigger
CREATE TRIGGER prevent_patient_deletion
BEFORE DELETE ON public.patient_queue
FOR EACH ROW
EXECUTE FUNCTION prevent_patient_queue_deletion();

-- 4. Mettre à jour la politique RLS pour interdire les suppressions directes
-- D'abord supprimer l'ancienne politique de suppression
DROP POLICY IF EXISTS "queue_delete_admin" ON public.patient_queue;

-- Créer la nouvelle politique qui interdit TOUTE suppression directe
CREATE POLICY "prevent_direct_deletion"
ON public.patient_queue
FOR DELETE
USING (false); -- Aucune suppression directe autorisée

-- 5. Créer la fonction d'archivage sécurisé
CREATE OR REPLACE FUNCTION safe_archive_patient_queue(
  p_queue_entry_id UUID,
  p_reason TEXT DEFAULT 'Clôture administrative standard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_entry RECORD;
  v_user_id UUID;
  v_structure_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Récupérer l'entrée de file d'attente
  SELECT * INTO v_queue_entry
  FROM patient_queue
  WHERE id = p_queue_entry_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entrée file d''attente non trouvée'
    );
  END IF;
  
  v_structure_id := v_queue_entry.structure_id;
  
  -- Vérifier que l'utilisateur appartient à la même structure
  IF v_structure_id != get_user_structure_id(v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Accès non autorisé à cette structure'
    );
  END IF;
  
  -- Vérifier les conditions de clôture
  IF v_queue_entry.billing_status NOT IN ('completed', 'waived', 'not_required') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Facturation non finalisée. Status actuel: ' || COALESCE(v_queue_entry.billing_status, 'pending'),
      'required_action', 'Finaliser la facturation avant archivage'
    );
  END IF;
  
  -- Procéder à l'archivage sécurisé
  UPDATE patient_queue
  SET 
    is_archived = true,
    closed_at = COALESCE(closed_at, now()),
    closed_by = COALESCE(closed_by, v_user_id),
    closure_reason = COALESCE(closure_reason, p_reason),
    status = 'archived',
    updated_at = now()
  WHERE id = p_queue_entry_id;
  
  -- Logger l'archivage réussi
  INSERT INTO activity_logs (
    structure_id,
    actor_user_id,
    patient_id,
    action,
    metadata
  ) VALUES (
    v_structure_id,
    v_user_id,
    v_queue_entry.patient_id,
    'PATIENT_QUEUE_ARCHIVED',
    jsonb_build_object(
      'queue_entry_id', p_queue_entry_id,
      'closure_reason', p_reason,
      'billing_status', v_queue_entry.billing_status,
      'archived_at', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Patient archivé avec succès',
    'archived_at', now(),
    'queue_entry_id', p_queue_entry_id
  );
END;
$$;

-- 6. Créer une fonction pour clôturer proprement une entrée de file d'attente
CREATE OR REPLACE FUNCTION close_patient_queue_entry(
  p_queue_entry_id UUID,
  p_billing_status TEXT DEFAULT 'completed',
  p_closure_reason TEXT DEFAULT 'Consultation terminée'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_entry RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Vérifier le billing_status
  IF p_billing_status NOT IN ('completed', 'waived', 'not_required') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Statut de facturation invalide. Valeurs acceptées: completed, waived, not_required'
    );
  END IF;
  
  -- Récupérer et vérifier l'entrée
  SELECT * INTO v_queue_entry
  FROM patient_queue
  WHERE id = p_queue_entry_id
    AND structure_id = get_user_structure_id(v_user_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entrée non trouvée ou accès non autorisé'
    );
  END IF;
  
  -- Mettre à jour avec les informations de clôture
  UPDATE patient_queue
  SET 
    billing_status = p_billing_status,
    closed_at = now(),
    closed_by = v_user_id,
    closure_reason = p_closure_reason,
    status = 'completed',
    completed_at = COALESCE(completed_at, now()),
    updated_at = now()
  WHERE id = p_queue_entry_id;
  
  -- Logger la clôture
  INSERT INTO activity_logs (
    structure_id,
    actor_user_id,
    patient_id,
    action,
    metadata
  ) VALUES (
    v_queue_entry.structure_id,
    v_user_id,
    v_queue_entry.patient_id,
    'PATIENT_QUEUE_CLOSED',
    jsonb_build_object(
      'queue_entry_id', p_queue_entry_id,
      'billing_status', p_billing_status,
      'closure_reason', p_closure_reason,
      'closed_at', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Entrée clôturée avec succès',
    'closed_at', now(),
    'billing_status', p_billing_status
  );
END;
$$;

-- 7. Ajouter un index pour les requêtes d'archivage
CREATE INDEX IF NOT EXISTS idx_patient_queue_archived 
ON public.patient_queue(is_archived, structure_id) 
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_patient_queue_billing_status 
ON public.patient_queue(billing_status, structure_id);

-- 8. Commenter les objets pour documentation
COMMENT ON COLUMN public.patient_queue.billing_status IS 'Statut de facturation: pending, completed, waived, not_required';
COMMENT ON COLUMN public.patient_queue.closed_at IS 'Horodatage de clôture administrative';
COMMENT ON COLUMN public.patient_queue.closed_by IS 'UUID de l''utilisateur ayant clôturé';
COMMENT ON COLUMN public.patient_queue.closure_reason IS 'Motif de clôture';
COMMENT ON COLUMN public.patient_queue.deletion_prevented IS 'Verrou anti-suppression actif';
COMMENT ON COLUMN public.patient_queue.is_archived IS 'Archivé (soft delete légal)';
COMMENT ON FUNCTION prevent_patient_queue_deletion() IS 'Trigger de protection juridique anti-suppression';
COMMENT ON FUNCTION safe_archive_patient_queue(UUID, TEXT) IS 'Archivage sécurisé conforme médico-légal';
COMMENT ON FUNCTION close_patient_queue_entry(UUID, TEXT, TEXT) IS 'Clôture administrative avec facturation';