-- Fix the audit trigger to use correct event type
CREATE OR REPLACE FUNCTION public.audit_sensitive_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_event_type audit_event_type;
  v_previous_value JSONB;
  v_new_value JSONB;
  v_structure_id UUID;
BEGIN
  -- Determine event type based on operation
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_event_type := 'data_modification';
      v_previous_value := NULL;
      v_new_value := to_jsonb(NEW);
      v_structure_id := NEW.structure_id;
    WHEN 'UPDATE' THEN
      v_event_type := 'data_modification';
      v_previous_value := to_jsonb(OLD);
      v_new_value := to_jsonb(NEW);
      v_structure_id := NEW.structure_id;
    WHEN 'DELETE' THEN
      v_event_type := 'data_modification';
      v_previous_value := to_jsonb(OLD);
      v_new_value := NULL;
      v_structure_id := OLD.structure_id;
    ELSE
      v_event_type := 'data_modification';
  END CASE;

  -- Insert audit log (skip if no structure_id - admin operations)
  IF v_structure_id IS NOT NULL THEN
    INSERT INTO public.immutable_audit_log (
      event_type,
      user_id,
      structure_id,
      resource_type,
      resource_id,
      action,
      previous_value,
      new_value,
      ip_address,
      hash_chain
    ) VALUES (
      v_event_type,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      v_structure_id,
      TG_TABLE_NAME,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      TG_OP,
      v_previous_value,
      v_new_value,
      '0.0.0.0'::inet,
      encode(sha256(COALESCE(v_previous_value::text, '') || COALESCE(v_new_value::text, '') || now()::text), 'hex')
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;