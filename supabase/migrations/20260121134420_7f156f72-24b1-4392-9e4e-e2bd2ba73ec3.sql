-- SPRINT 1C: Table d'historique des changements de statuts patient

-- 1. Crée la table patient_queue_status_history
CREATE TABLE public.patient_queue_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.patient_queue(id) ON DELETE CASCADE,
  structure_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  change_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text
);

-- 2. Ajoute des index pour performance
CREATE INDEX idx_queue_status_history_queue_id ON public.patient_queue_status_history(queue_id);
CREATE INDEX idx_queue_status_history_changed_at ON public.patient_queue_status_history(changed_at DESC);
CREATE INDEX idx_queue_status_history_changed_by ON public.patient_queue_status_history(changed_by);
CREATE INDEX idx_queue_status_history_structure_id ON public.patient_queue_status_history(structure_id);

-- 3. Crée le trigger AFTER UPDATE sur patient_queue
CREATE OR REPLACE FUNCTION public.log_patient_queue_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.patient_queue_status_history (
      queue_id,
      structure_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      change_reason,
      metadata
    ) VALUES (
      NEW.id,
      NEW.structure_id,
      OLD.status,
      NEW.status,
      NEW.status_changed_by,
      COALESCE(NEW.status_changed_at, now()),
      NEW.status_change_reason,
      jsonb_build_object(
        'billing_status', NEW.billing_status,
        'priority', NEW.priority,
        'patient_id', NEW.patient_id,
        'assigned_to', NEW.assigned_to
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_patient_queue_status_change
AFTER UPDATE ON public.patient_queue
FOR EACH ROW
EXECUTE FUNCTION public.log_patient_queue_status_change();

-- 4. Crée une vue pour faciliter les requêtes timeline
CREATE OR REPLACE VIEW public.patient_queue_status_timeline AS
SELECT 
  h.id,
  h.queue_id,
  h.structure_id,
  pq.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  h.previous_status,
  h.new_status,
  h.changed_by,
  pr.first_name || ' ' || pr.last_name AS changed_by_name,
  h.changed_at,
  h.change_reason,
  h.metadata,
  EXTRACT(EPOCH FROM (h.changed_at - LAG(h.changed_at) OVER (PARTITION BY h.queue_id ORDER BY h.changed_at))) / 60 AS duration_in_previous_status_minutes
FROM public.patient_queue_status_history h
JOIN public.patient_queue pq ON h.queue_id = pq.id
JOIN public.patients p ON pq.patient_id = p.id
LEFT JOIN public.profiles pr ON h.changed_by = pr.user_id
ORDER BY h.changed_at DESC;

-- 5. Active Row Level Security (RLS)
ALTER TABLE public.patient_queue_status_history ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: Visible par tous les utilisateurs de la même structure
CREATE POLICY "status_history_select_same_structure"
ON public.patient_queue_status_history FOR SELECT
USING (structure_id = get_user_structure_id(auth.uid()));

-- Politique INSERT: Seul le trigger peut insérer (via SECURITY DEFINER)
-- Mais on permet aussi l'insertion par les utilisateurs de la structure pour les cas manuels
CREATE POLICY "status_history_insert_same_structure"
ON public.patient_queue_status_history FOR INSERT
WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

-- L'historique est immuable - pas de UPDATE ni DELETE
CREATE POLICY "status_history_no_update"
ON public.patient_queue_status_history FOR UPDATE
USING (false);

CREATE POLICY "status_history_no_delete"
ON public.patient_queue_status_history FOR DELETE
USING (false);

-- 6. Trigger pour INSERT initial (premier statut)
CREATE OR REPLACE FUNCTION public.log_patient_queue_initial_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.patient_queue_status_history (
    queue_id,
    structure_id,
    previous_status,
    new_status,
    changed_by,
    changed_at,
    change_reason,
    metadata
  ) VALUES (
    NEW.id,
    NEW.structure_id,
    NULL,
    NEW.status,
    NEW.status_changed_by,
    COALESCE(NEW.created_at, now()),
    'Initial status',
    jsonb_build_object(
      'billing_status', NEW.billing_status,
      'priority', NEW.priority,
      'patient_id', NEW.patient_id,
      'source', 'queue_creation'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_patient_queue_initial_status
AFTER INSERT ON public.patient_queue
FOR EACH ROW
EXECUTE FUNCTION public.log_patient_queue_initial_status();