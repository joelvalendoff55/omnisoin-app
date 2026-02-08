-- Create generic audit trigger function for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type audit_event_type;
  v_action TEXT;
  v_previous_value JSONB;
  v_new_value JSONB;
  v_resource_id UUID;
  v_structure_id UUID;
BEGIN
  -- Determine event type based on operation
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_event_type := 'create';
      v_action := TG_TABLE_NAME || '_created';
      v_previous_value := NULL;
      v_new_value := to_jsonb(NEW);
      v_resource_id := NEW.id;
      v_structure_id := NEW.structure_id;
    WHEN 'UPDATE' THEN
      v_event_type := 'update';
      v_action := TG_TABLE_NAME || '_updated';
      v_previous_value := to_jsonb(OLD);
      v_new_value := to_jsonb(NEW);
      v_resource_id := NEW.id;
      v_structure_id := NEW.structure_id;
    WHEN 'DELETE' THEN
      v_event_type := 'delete';
      v_action := TG_TABLE_NAME || '_deleted';
      v_previous_value := to_jsonb(OLD);
      v_new_value := NULL;
      v_resource_id := OLD.id;
      v_structure_id := OLD.structure_id;
  END CASE;

  -- Insert into immutable audit log (hash chain computed by existing trigger)
  INSERT INTO public.immutable_audit_log (
    event_type,
    user_id,
    structure_id,
    resource_type,
    resource_id,
    action,
    previous_value,
    new_value,
    session_id
  ) VALUES (
    v_event_type,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    v_structure_id,
    TG_TABLE_NAME,
    v_resource_id,
    v_action,
    v_previous_value,
    v_new_value,
    gen_random_uuid()
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for patients table
DROP TRIGGER IF EXISTS audit_patients_insert ON public.patients;
CREATE TRIGGER audit_patients_insert
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

DROP TRIGGER IF EXISTS audit_patients_update ON public.patients;
CREATE TRIGGER audit_patients_update
  AFTER UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

DROP TRIGGER IF EXISTS audit_patients_delete ON public.patients;
CREATE TRIGGER audit_patients_delete
  AFTER DELETE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

-- Create triggers for consultations table
DROP TRIGGER IF EXISTS audit_consultations_insert ON public.consultations;
CREATE TRIGGER audit_consultations_insert
  AFTER INSERT ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

DROP TRIGGER IF EXISTS audit_consultations_update ON public.consultations;
CREATE TRIGGER audit_consultations_update
  AFTER UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

DROP TRIGGER IF EXISTS audit_consultations_delete ON public.consultations;
CREATE TRIGGER audit_consultations_delete
  AFTER DELETE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

-- Create triggers for patient_transcripts table
DROP TRIGGER IF EXISTS audit_patient_transcripts_insert ON public.patient_transcripts;
CREATE TRIGGER audit_patient_transcripts_insert
  AFTER INSERT ON public.patient_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

DROP TRIGGER IF EXISTS audit_patient_transcripts_update ON public.patient_transcripts;
CREATE TRIGGER audit_patient_transcripts_update
  AFTER UPDATE ON public.patient_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

DROP TRIGGER IF EXISTS audit_patient_transcripts_delete ON public.patient_transcripts;
CREATE TRIGGER audit_patient_transcripts_delete
  AFTER DELETE ON public.patient_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

-- Add comment for documentation
COMMENT ON FUNCTION public.audit_sensitive_table_changes() IS 
'Generic audit trigger function that logs all INSERT/UPDATE/DELETE operations on sensitive tables to immutable_audit_log with full before/after snapshots and hash chain integrity.';