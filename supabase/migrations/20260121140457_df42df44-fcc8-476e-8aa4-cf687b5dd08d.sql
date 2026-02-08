-- SPRINT 3: Pré-consultation sécurisée

-- 1. Créer enum pour statut d'attente
DO $$ BEGIN
  CREATE TYPE waiting_status AS ENUM ('arrived', 'waiting', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Créer enum pour priorité pré-consultation
DO $$ BEGIN
  CREATE TYPE preconsultation_priority AS ENUM ('normal', 'urgent', 'emergency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Créer table preconsultations
CREATE TABLE IF NOT EXISTS public.preconsultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  queue_entry_id UUID REFERENCES public.patient_queue(id),
  created_by UUID NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  waiting_status waiting_status NOT NULL DEFAULT 'arrived',
  priority preconsultation_priority NOT NULL DEFAULT 'normal',
  initial_symptoms TEXT,
  vital_signs JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  assigned_to UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Activer RLS
ALTER TABLE public.preconsultations ENABLE ROW LEVEL SECURITY;

-- 5. Policies RLS
-- Lecture : toute l'équipe de la structure
CREATE POLICY "preconsultations_select_same_structure"
  ON public.preconsultations
  FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

-- Insertion : assistant, coordinator, admin, practitioner
CREATE POLICY "preconsultations_insert_staff"
  ON public.preconsultations
  FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid()) 
    AND created_by = auth.uid()
    AND (
      has_role(auth.uid(), 'assistant'::app_role) OR
      has_role(auth.uid(), 'coordinator'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'practitioner'::app_role)
    )
  );

-- Update : assistant, coordinator, admin, practitioner
CREATE POLICY "preconsultations_update_staff"
  ON public.preconsultations
  FOR UPDATE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND (
      has_role(auth.uid(), 'assistant'::app_role) OR
      has_role(auth.uid(), 'coordinator'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'practitioner'::app_role)
    )
  );

-- Delete : admin uniquement
CREATE POLICY "preconsultations_delete_admin"
  ON public.preconsultations
  FOR DELETE
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. Créer table audit pour pré-consultations
CREATE TABLE IF NOT EXISTS public.preconsultation_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preconsultation_id UUID NOT NULL REFERENCES public.preconsultations(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_status waiting_status,
  new_status waiting_status,
  previous_priority preconsultation_priority,
  new_priority preconsultation_priority,
  changed_by UUID NOT NULL,
  changed_by_role app_role NOT NULL,
  change_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. RLS pour audit
ALTER TABLE public.preconsultation_audit ENABLE ROW LEVEL SECURITY;

-- Lecture audit
CREATE POLICY "preconsultation_audit_select_same_structure"
  ON public.preconsultation_audit
  FOR SELECT
  USING (structure_id = get_user_structure_id(auth.uid()));

-- Insert audit (via trigger)
CREATE POLICY "preconsultation_audit_insert_same_structure"
  ON public.preconsultation_audit
  FOR INSERT
  WITH CHECK (structure_id = get_user_structure_id(auth.uid()));

-- Pas de update/delete sur audit
CREATE POLICY "preconsultation_audit_no_update"
  ON public.preconsultation_audit
  FOR UPDATE
  USING (false);

CREATE POLICY "preconsultation_audit_no_delete"
  ON public.preconsultation_audit
  FOR DELETE
  USING (false);

-- 8. Trigger pour audit automatique
CREATE OR REPLACE FUNCTION public.log_preconsultation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role app_role;
BEGIN
  v_user_role := get_user_primary_role(auth.uid());
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.preconsultation_audit (
      preconsultation_id,
      structure_id,
      action,
      new_status,
      new_priority,
      changed_by,
      changed_by_role,
      metadata
    ) VALUES (
      NEW.id,
      NEW.structure_id,
      'created',
      NEW.waiting_status,
      NEW.priority,
      auth.uid(),
      COALESCE(v_user_role, 'assistant'),
      jsonb_build_object(
        'patient_id', NEW.patient_id,
        'initial_symptoms', NEW.initial_symptoms
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status change
    IF OLD.waiting_status IS DISTINCT FROM NEW.waiting_status THEN
      INSERT INTO public.preconsultation_audit (
        preconsultation_id,
        structure_id,
        action,
        previous_status,
        new_status,
        changed_by,
        changed_by_role,
        metadata
      ) VALUES (
        NEW.id,
        NEW.structure_id,
        'status_changed',
        OLD.waiting_status,
        NEW.waiting_status,
        auth.uid(),
        COALESCE(v_user_role, 'assistant'),
        jsonb_build_object(
          'patient_id', NEW.patient_id
        )
      );
    END IF;
    
    -- Log priority change
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.preconsultation_audit (
        preconsultation_id,
        structure_id,
        action,
        previous_priority,
        new_priority,
        changed_by,
        changed_by_role,
        metadata
      ) VALUES (
        NEW.id,
        NEW.structure_id,
        'priority_changed',
        OLD.priority,
        NEW.priority,
        auth.uid(),
        COALESCE(v_user_role, 'assistant'),
        jsonb_build_object(
          'patient_id', NEW.patient_id,
          'reason', 'Manual priority update'
        )
      );
    END IF;
    
    -- Update timestamp
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 9. Attacher trigger
DROP TRIGGER IF EXISTS preconsultation_audit_trigger ON public.preconsultations;
CREATE TRIGGER preconsultation_audit_trigger
  AFTER INSERT OR UPDATE ON public.preconsultations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_preconsultation_changes();

-- 10. Index pour performance
CREATE INDEX IF NOT EXISTS idx_preconsultations_structure_status 
  ON public.preconsultations(structure_id, waiting_status);
CREATE INDEX IF NOT EXISTS idx_preconsultations_patient 
  ON public.preconsultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_preconsultations_arrival 
  ON public.preconsultations(arrival_time DESC);
CREATE INDEX IF NOT EXISTS idx_preconsultation_audit_preconsultation 
  ON public.preconsultation_audit(preconsultation_id);

-- 11. Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.preconsultations;