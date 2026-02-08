-- Enable pgcrypto extension for SHA256 hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to compute hash chain for new audit log entries
CREATE OR REPLACE FUNCTION public.compute_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    v_previous_hash := 'GENESIS_' || encode(digest(NEW.structure_id::text, 'sha256'), 'hex');
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
  NEW.hash_chain := encode(digest(v_previous_hash || v_log_data, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-compute hash chain on insert
DROP TRIGGER IF EXISTS trigger_compute_hash_chain ON public.immutable_audit_log;
CREATE TRIGGER trigger_compute_hash_chain
  BEFORE INSERT ON public.immutable_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_log_hash_chain();

-- Function to verify hash chain integrity
CREATE OR REPLACE FUNCTION public.verify_hash_chain_integrity(
  p_structure_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  is_valid boolean,
  total_logs bigint,
  first_broken_at timestamp with time zone,
  broken_log_id uuid,
  expected_hash text,
  actual_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log RECORD;
  v_previous_hash TEXT;
  v_computed_hash TEXT;
  v_log_data TEXT;
  v_count BIGINT := 0;
  v_is_valid BOOLEAN := true;
  v_first_broken_at TIMESTAMPTZ;
  v_broken_log_id UUID;
  v_expected_hash TEXT;
  v_actual_hash TEXT;
BEGIN
  -- Initialize with genesis hash for this structure
  v_previous_hash := 'GENESIS_' || encode(digest(p_structure_id::text, 'sha256'), 'hex');
  
  -- Iterate through logs in chronological order
  FOR v_log IN
    SELECT *
    FROM public.immutable_audit_log
    WHERE structure_id = p_structure_id
      AND (p_start_date IS NULL OR log_timestamp >= p_start_date)
      AND (p_end_date IS NULL OR log_timestamp <= p_end_date)
    ORDER BY log_timestamp ASC, id ASC
  LOOP
    v_count := v_count + 1;
    
    -- Reconstruct the log data exactly as it was when hash was computed
    v_log_data := concat_ws('|',
      v_log.log_timestamp::text,
      v_log.event_type::text,
      COALESCE(v_log.user_id::text, 'NULL'),
      v_log.structure_id::text,
      COALESCE(v_log.resource_type, 'NULL'),
      COALESCE(v_log.resource_id::text, 'NULL'),
      v_log.action,
      COALESCE(v_log.previous_value::text, 'NULL'),
      COALESCE(v_log.new_value::text, 'NULL')
    );
    
    -- Compute expected hash
    v_computed_hash := encode(digest(v_previous_hash || v_log_data, 'sha256'), 'hex');
    
    -- Verify hash matches stored value
    IF v_computed_hash != v_log.hash_chain THEN
      v_is_valid := false;
      v_first_broken_at := v_log.log_timestamp;
      v_broken_log_id := v_log.id;
      v_expected_hash := v_computed_hash;
      v_actual_hash := v_log.hash_chain;
      EXIT; -- Stop at first broken link
    END IF;
    
    -- Use current hash as previous for next iteration
    v_previous_hash := v_log.hash_chain;
  END LOOP;
  
  -- Return verification results
  RETURN QUERY SELECT 
    v_is_valid,
    v_count,
    v_first_broken_at,
    v_broken_log_id,
    v_expected_hash,
    v_actual_hash;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.compute_log_hash_chain() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_hash_chain_integrity(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;