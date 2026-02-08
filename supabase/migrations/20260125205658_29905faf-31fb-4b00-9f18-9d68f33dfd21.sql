-- Fix compute_log_hash_chain to use extensions.digest
CREATE OR REPLACE FUNCTION public.compute_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_previous_hash TEXT;
  v_log_data TEXT;
BEGIN
  -- Get previous hash or use genesis hash
  SELECT hash_chain INTO v_previous_hash
  FROM public.immutable_audit_log
  WHERE structure_id = NEW.structure_id
  ORDER BY log_timestamp DESC, id DESC
  LIMIT 1;
  
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_' || encode(extensions.digest(NEW.structure_id::text::bytea, 'sha256'), 'hex');
  END IF;
  
  -- Build log data string for hashing
  v_log_data := concat_ws('|',
    NEW.log_timestamp::text,
    NEW.event_type::text,
    COALESCE(NEW.user_id::text, 'NULL'),
    NEW.structure_id::text,
    COALESCE(NEW.resource_type, 'NULL'),
    COALESCE(NEW.resource_id::text, 'NULL'),
    NEW.action,
    COALESCE(NEW.previous_value::text, 'NULL'),
    COALESCE(NEW.new_value::text, 'NULL')
  );
  
  -- Compute SHA256 hash chain
  NEW.hash_chain := encode(extensions.digest((v_previous_hash || v_log_data)::bytea, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$function$;