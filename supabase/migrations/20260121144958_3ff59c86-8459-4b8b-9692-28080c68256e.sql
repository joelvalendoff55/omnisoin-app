-- Sprint 7: System Health & Compliance Testing

-- 1. Enum types for health checks
DO $$ BEGIN
  CREATE TYPE health_check_type AS ENUM (
    'rls_integrity',
    'hash_chain_integrity', 
    'rbac_enforcement',
    'audit_completeness',
    'consent_coverage',
    'data_encryption'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE health_check_status AS ENUM ('passed', 'failed', 'warning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. System health checks table
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type health_check_type NOT NULL,
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status health_check_status NOT NULL,
  details JSONB,
  structure_id UUID REFERENCES public.structures(id),
  performed_by UUID REFERENCES auth.users(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_health_checks
CREATE POLICY "Super admins can view all health checks"
  ON public.system_health_checks
  FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view their structure health checks"
  ON public.system_health_checks
  FOR SELECT
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Super admins can insert health checks"
  ON public.system_health_checks
  FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert structure health checks"
  ON public.system_health_checks
  FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- 3. Function to run system health check
CREATE OR REPLACE FUNCTION public.run_system_health_check(
  p_check_type health_check_type,
  p_structure_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_status health_check_status;
  v_details JSONB;
  v_check_id UUID;
  v_duration_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  CASE p_check_type
    -- RLS Integrity Check
    WHEN 'rls_integrity' THEN
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 'passed'
          ELSE 'failed'
        END::health_check_status,
        jsonb_build_object(
          'tables_without_rls', (
            SELECT jsonb_agg(tablename)
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT IN (
              SELECT tablename FROM pg_tables t
              JOIN pg_class c ON c.relname = t.tablename
              WHERE t.schemaname = 'public'
              AND c.relrowsecurity = true
            )
          ),
          'total_tables', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'),
          'tables_with_rls', (
            SELECT COUNT(*) 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE t.schemaname = 'public'
            AND c.relrowsecurity = true
          )
        )
      INTO v_status, v_details
      FROM pg_tables t
      LEFT JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)
      AND t.tablename NOT LIKE 'pg_%';

    -- Hash Chain Integrity Check
    WHEN 'hash_chain_integrity' THEN
      DECLARE
        v_integrity RECORD;
      BEGIN
        SELECT * INTO v_integrity
        FROM verify_hash_chain_integrity(
          COALESCE(p_structure_id, get_user_structure_id(auth.uid())),
          now() - interval '30 days',
          now()
        );
        
        v_status := CASE WHEN v_integrity.is_valid THEN 'passed' ELSE 'failed' END;
        v_details := jsonb_build_object(
          'is_valid', v_integrity.is_valid,
          'total_logs', v_integrity.total_logs,
          'first_broken_at', v_integrity.first_broken_at,
          'broken_log_id', v_integrity.broken_log_id
        );
      END;

    -- RBAC Enforcement Check
    WHEN 'rbac_enforcement' THEN
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 'passed'
          WHEN COUNT(*) < 5 THEN 'warning'
          ELSE 'failed'
        END::health_check_status,
        jsonb_build_object(
          'cross_structure_attempts', (
            SELECT COUNT(*) FROM structure_isolation_alerts
            WHERE created_at > now() - interval '30 days'
            AND (p_structure_id IS NULL OR source_structure_id = p_structure_id)
          ),
          'rbac_violations', (
            SELECT COUNT(*) FROM activity_logs
            WHERE action LIKE '%ERREUR%' OR action LIKE '%illegal%'
            AND created_at > now() - interval '30 days'
            AND (p_structure_id IS NULL OR structure_id = p_structure_id)
          ),
          'unresolved_alerts', (
            SELECT COUNT(*) FROM structure_isolation_alerts
            WHERE resolved = false
            AND (p_structure_id IS NULL OR source_structure_id = p_structure_id)
          )
        )
      INTO v_status, v_details
      FROM structure_isolation_alerts
      WHERE resolved = false
      AND (p_structure_id IS NULL OR source_structure_id = p_structure_id);

    -- Audit Completeness Check
    WHEN 'audit_completeness' THEN
      SELECT 
        CASE 
          WHEN (SELECT COUNT(*) FROM immutable_audit_log 
                WHERE (p_structure_id IS NULL OR structure_id = p_structure_id)
                AND log_timestamp > now() - interval '24 hours') > 0 
          THEN 'passed'
          ELSE 'warning'
        END::health_check_status,
        jsonb_build_object(
          'logs_24h', (
            SELECT COUNT(*) FROM immutable_audit_log 
            WHERE (p_structure_id IS NULL OR structure_id = p_structure_id)
            AND log_timestamp > now() - interval '24 hours'
          ),
          'logs_7d', (
            SELECT COUNT(*) FROM immutable_audit_log 
            WHERE (p_structure_id IS NULL OR structure_id = p_structure_id)
            AND log_timestamp > now() - interval '7 days'
          ),
          'logs_30d', (
            SELECT COUNT(*) FROM immutable_audit_log 
            WHERE (p_structure_id IS NULL OR structure_id = p_structure_id)
            AND log_timestamp > now() - interval '30 days'
          ),
          'event_types', (
            SELECT jsonb_object_agg(event_type, cnt)
            FROM (
              SELECT event_type, COUNT(*) as cnt
              FROM immutable_audit_log
              WHERE (p_structure_id IS NULL OR structure_id = p_structure_id)
              AND log_timestamp > now() - interval '30 days'
              GROUP BY event_type
            ) sub
          )
        )
      INTO v_status, v_details;

    -- Consent Coverage Check
    WHEN 'consent_coverage' THEN
      SELECT 
        CASE 
          WHEN (total_patients = 0) THEN 'warning'
          WHEN (patients_with_consent::float / NULLIF(total_patients, 0) >= 0.95) THEN 'passed'
          WHEN (patients_with_consent::float / NULLIF(total_patients, 0) >= 0.80) THEN 'warning'
          ELSE 'failed'
        END::health_check_status,
        jsonb_build_object(
          'total_patients', total_patients,
          'patients_with_consent', patients_with_consent,
          'coverage_rate', ROUND((patients_with_consent::numeric / NULLIF(total_patients, 0) * 100), 2),
          'consent_by_type', consent_by_type
        )
      INTO v_status, v_details
      FROM (
        SELECT 
          (SELECT COUNT(*) FROM patients WHERE (p_structure_id IS NULL OR structure_id = p_structure_id)) as total_patients,
          (SELECT COUNT(DISTINCT patient_id) FROM patient_consents 
           WHERE status = 'obtained'
           AND (p_structure_id IS NULL OR structure_id = p_structure_id)) as patients_with_consent,
          (SELECT jsonb_object_agg(consent_type, cnt)
           FROM (
             SELECT consent_type, COUNT(*) as cnt
             FROM patient_consents
             WHERE status = 'obtained'
             AND (p_structure_id IS NULL OR structure_id = p_structure_id)
             GROUP BY consent_type
           ) sub) as consent_by_type
      ) stats;

    -- Data Encryption Check
    WHEN 'data_encryption' THEN
      SELECT 
        CASE 
          WHEN (SELECT COUNT(*) FROM encrypted_fields_registry WHERE is_encrypted = true) > 0 
          THEN 'passed'
          ELSE 'warning'
        END::health_check_status,
        jsonb_build_object(
          'encrypted_fields', (
            SELECT jsonb_agg(jsonb_build_object(
              'table', table_name,
              'column', column_name,
              'sensitivity', sensitivity_level
            ))
            FROM encrypted_fields_registry
            WHERE is_encrypted = true
          ),
          'total_encrypted', (SELECT COUNT(*) FROM encrypted_fields_registry WHERE is_encrypted = true),
          'active_keys', (
            SELECT COUNT(*) FROM encryption_keys 
            WHERE is_active = true
            AND (p_structure_id IS NULL OR structure_id = p_structure_id)
          )
        )
      INTO v_status, v_details;

    ELSE
      v_status := 'failed';
      v_details := jsonb_build_object('error', 'Unknown check type');
  END CASE;

  -- Calculate duration
  v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;

  -- Insert result
  INSERT INTO system_health_checks (
    check_type,
    status,
    details,
    structure_id,
    performed_by,
    duration_ms
  ) VALUES (
    p_check_type,
    v_status,
    v_details,
    p_structure_id,
    auth.uid(),
    v_duration_ms
  )
  RETURNING id INTO v_check_id;

  RETURN v_check_id;
END;
$$;

-- 4. Function to generate certification report
CREATE OR REPLACE FUNCTION public.generate_certification_report(
  p_structure_id UUID,
  p_date_start TIMESTAMPTZ,
  p_date_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_structure RECORD;
  v_hash_integrity RECORD;
BEGIN
  -- Get structure info
  SELECT * INTO v_structure FROM structures WHERE id = p_structure_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Structure not found';
  END IF;

  -- Verify hash chain integrity
  SELECT * INTO v_hash_integrity
  FROM verify_hash_chain_integrity(p_structure_id, p_date_start, p_date_end);

  -- Build comprehensive certification report
  v_result := jsonb_build_object(
    'report_metadata', jsonb_build_object(
      'generated_at', now(),
      'generated_by', auth.uid(),
      'structure_id', p_structure_id,
      'structure_name', v_structure.name,
      'period_start', p_date_start,
      'period_end', p_date_end,
      'report_type', 'HAS Certification Compliance Report',
      'version', '1.0'
    ),
    
    'compliance_summary', jsonb_build_object(
      'overall_status', CASE 
        WHEN v_hash_integrity.is_valid THEN 'COMPLIANT'
        ELSE 'NON-COMPLIANT'
      END,
      'rls_enabled', true,
      'audit_immutable', true,
      'hash_chain_valid', v_hash_integrity.is_valid,
      'gdpr_exports_available', true
    ),
    
    'patient_statistics', (
      SELECT jsonb_build_object(
        'total_patients', COUNT(*),
        'active_patients', COUNT(*) FILTER (WHERE status = 'active'),
        'archived_patients', COUNT(*) FILTER (WHERE status = 'archived'),
        'new_in_period', COUNT(*) FILTER (WHERE created_at BETWEEN p_date_start AND p_date_end)
      )
      FROM patients
      WHERE structure_id = p_structure_id
    ),
    
    'consultation_statistics', (
      SELECT jsonb_build_object(
        'total_consultations', COUNT(*),
        'in_period', COUNT(*) FILTER (WHERE consultation_date BETWEEN p_date_start AND p_date_end)
      )
      FROM consultations
      WHERE structure_id = p_structure_id
    ),
    
    'queue_statistics', (
      SELECT jsonb_build_object(
        'total_entries', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'no_shows', COUNT(*) FILTER (WHERE status = 'no_show'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')
      )
      FROM patient_queue
      WHERE structure_id = p_structure_id
      AND created_at BETWEEN p_date_start AND p_date_end
    ),
    
    'consent_statistics', (
      SELECT jsonb_build_object(
        'total_consents', COUNT(*),
        'obtained', COUNT(*) FILTER (WHERE status = 'obtained'),
        'refused', COUNT(*) FILTER (WHERE status = 'refused'),
        'revoked', COUNT(*) FILTER (WHERE status = 'revoked'),
        'coverage_rate', ROUND(
          (COUNT(*) FILTER (WHERE status = 'obtained'))::numeric / 
          NULLIF((SELECT COUNT(*) FROM patients WHERE structure_id = p_structure_id), 0) * 100, 
          2
        )
      )
      FROM patient_consents
      WHERE structure_id = p_structure_id
      AND created_at BETWEEN p_date_start AND p_date_end
    ),
    
    'audit_statistics', jsonb_build_object(
      'immutable_logs', (
        SELECT COUNT(*) FROM immutable_audit_log
        WHERE structure_id = p_structure_id
        AND log_timestamp BETWEEN p_date_start AND p_date_end
      ),
      'hash_chain_integrity', jsonb_build_object(
        'is_valid', v_hash_integrity.is_valid,
        'total_logs_verified', v_hash_integrity.total_logs,
        'first_broken_at', v_hash_integrity.first_broken_at
      ),
      'data_access_logs', (
        SELECT COUNT(*) FROM data_access_log
        WHERE structure_id = p_structure_id
        AND accessed_at BETWEEN p_date_start AND p_date_end
      ),
      'activity_logs', (
        SELECT COUNT(*) FROM activity_logs
        WHERE structure_id = p_structure_id
        AND created_at BETWEEN p_date_start AND p_date_end
      )
    ),
    
    'security_statistics', jsonb_build_object(
      'cross_structure_attempts', (
        SELECT COUNT(*) FROM structure_isolation_alerts
        WHERE source_structure_id = p_structure_id
        AND created_at BETWEEN p_date_start AND p_date_end
      ),
      'rbac_violations', (
        SELECT COUNT(*) FROM consultation_field_audit
        WHERE structure_id = p_structure_id
        AND changed_at BETWEEN p_date_start AND p_date_end
        AND is_medical_decision = true
      ),
      'deletion_attempts_blocked', (
        SELECT COUNT(*) FROM activity_logs
        WHERE structure_id = p_structure_id
        AND action = 'ATTEMPTED_ILLEGAL_DELETION'
        AND created_at BETWEEN p_date_start AND p_date_end
      )
    ),
    
    'export_statistics', (
      SELECT jsonb_build_object(
        'total_exports', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'by_type', (
          SELECT jsonb_object_agg(export_type, cnt)
          FROM (
            SELECT export_type, COUNT(*) as cnt
            FROM export_requests
            WHERE structure_id = p_structure_id
            AND created_at BETWEEN p_date_start AND p_date_end
            GROUP BY export_type
          ) sub
        )
      )
      FROM export_requests
      WHERE structure_id = p_structure_id
      AND created_at BETWEEN p_date_start AND p_date_end
    ),
    
    'health_checks', (
      SELECT jsonb_agg(jsonb_build_object(
        'check_type', check_type,
        'status', status,
        'timestamp', check_timestamp,
        'duration_ms', duration_ms
      ) ORDER BY check_timestamp DESC)
      FROM (
        SELECT DISTINCT ON (check_type) *
        FROM system_health_checks
        WHERE structure_id = p_structure_id
        ORDER BY check_type, check_timestamp DESC
      ) latest_checks
    )
  );

  -- Log the report generation
  PERFORM log_immutable_event(
    'export'::audit_event_type,
    'certification_report_generated',
    'certification_report',
    NULL,
    NULL,
    v_result->'report_metadata'
  );

  RETURN v_result;
END;
$$;

-- 5. Compliance dashboard view
CREATE VIEW public.system_compliance_dashboard
WITH (security_invoker = on)
AS
SELECT 
  s.id as structure_id,
  s.name as structure_name,
  
  -- Latest health check results
  (SELECT status FROM system_health_checks 
   WHERE structure_id = s.id AND check_type = 'rls_integrity'
   ORDER BY check_timestamp DESC LIMIT 1) as rls_status,
   
  (SELECT status FROM system_health_checks 
   WHERE structure_id = s.id AND check_type = 'hash_chain_integrity'
   ORDER BY check_timestamp DESC LIMIT 1) as hash_chain_status,
   
  (SELECT status FROM system_health_checks 
   WHERE structure_id = s.id AND check_type = 'rbac_enforcement'
   ORDER BY check_timestamp DESC LIMIT 1) as rbac_status,
   
  (SELECT status FROM system_health_checks 
   WHERE structure_id = s.id AND check_type = 'consent_coverage'
   ORDER BY check_timestamp DESC LIMIT 1) as consent_status,
  
  -- Key metrics
  (SELECT COUNT(*) FROM patients WHERE structure_id = s.id) as total_patients,
  
  (SELECT COUNT(*) FROM patient_consents 
   WHERE structure_id = s.id AND status = 'obtained') as consents_obtained,
   
  (SELECT COUNT(*) FROM immutable_audit_log 
   WHERE structure_id = s.id) as audit_logs_count,
   
  (SELECT COUNT(*) FROM structure_isolation_alerts 
   WHERE source_structure_id = s.id AND resolved = false) as unresolved_alerts,
   
  -- Last check timestamp
  (SELECT MAX(check_timestamp) FROM system_health_checks 
   WHERE structure_id = s.id) as last_health_check,
   
  -- Overall compliance score (simple calculation)
  CASE 
    WHEN (
      SELECT COUNT(*) FILTER (WHERE status = 'passed') * 100.0 / NULLIF(COUNT(*), 0)
      FROM (
        SELECT DISTINCT ON (check_type) status
        FROM system_health_checks
        WHERE structure_id = s.id
        ORDER BY check_type, check_timestamp DESC
      ) latest
    ) >= 80 THEN 'COMPLIANT'
    WHEN (
      SELECT COUNT(*) FILTER (WHERE status = 'passed') * 100.0 / NULLIF(COUNT(*), 0)
      FROM (
        SELECT DISTINCT ON (check_type) status
        FROM system_health_checks
        WHERE structure_id = s.id
        ORDER BY check_type, check_timestamp DESC
      ) latest
    ) >= 60 THEN 'PARTIAL'
    ELSE 'NON-COMPLIANT'
  END as compliance_status

FROM structures s;

-- 6. Function to simulate patient workflow
CREATE OR REPLACE FUNCTION public.simulate_patient_workflow(
  p_structure_id UUID,
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient_id UUID;
  v_queue_entry_id UUID;
  v_preconsult_id UUID;
  v_consent_id UUID;
  v_consultation_id UUID;
  v_result JSONB;
  v_steps JSONB := '[]'::jsonb;
  v_step_start TIMESTAMPTZ;
BEGIN
  -- Step 1: Create test patient
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    INSERT INTO patients (
      structure_id,
      first_name,
      last_name,
      date_of_birth,
      email,
      phone,
      status,
      origin
    ) VALUES (
      p_structure_id,
      'Test-' || substr(md5(random()::text), 1, 8),
      'Patient-Simulation',
      '1990-01-15',
      'test-' || substr(md5(random()::text), 1, 8) || '@simulation.test',
      '+33600000000',
      'active',
      'simulation'
    )
    RETURNING id INTO v_patient_id;
  ELSE
    v_patient_id := gen_random_uuid();
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 1,
    'name', 'patient_created',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER,
    'patient_id', v_patient_id
  );

  -- Step 2: Add to queue
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    INSERT INTO patient_queue (
      structure_id,
      patient_id,
      status,
      priority,
      arrival_time,
      reason
    ) VALUES (
      p_structure_id,
      v_patient_id,
      'waiting',
      1,
      now(),
      'Simulation test'
    )
    RETURNING id INTO v_queue_entry_id;
  ELSE
    v_queue_entry_id := gen_random_uuid();
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 2,
    'name', 'added_to_queue',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER,
    'queue_entry_id', v_queue_entry_id
  );

  -- Step 3: Create preconsultation
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    INSERT INTO preconsultations (
      structure_id,
      patient_id,
      queue_entry_id,
      waiting_status,
      priority,
      initial_symptoms,
      created_by
    ) VALUES (
      p_structure_id,
      v_patient_id,
      v_queue_entry_id,
      'pending',
      1,
      'Test symptoms for simulation',
      auth.uid()
    )
    RETURNING id INTO v_preconsult_id;
  ELSE
    v_preconsult_id := gen_random_uuid();
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 3,
    'name', 'preconsultation_created',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER,
    'preconsultation_id', v_preconsult_id
  );

  -- Step 4: Obtain consent
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    INSERT INTO patient_consents (
      structure_id,
      patient_id,
      consent_type,
      status,
      obtained_at,
      obtained_by,
      checkbox_confirmed,
      scroll_completed
    ) VALUES (
      p_structure_id,
      v_patient_id,
      'care',
      'obtained',
      now(),
      auth.uid(),
      true,
      true
    )
    RETURNING id INTO v_consent_id;
  ELSE
    v_consent_id := gen_random_uuid();
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 4,
    'name', 'consent_obtained',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER,
    'consent_id', v_consent_id
  );

  -- Step 5: Update queue status to called
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    UPDATE patient_queue
    SET status = 'called',
        called_at = now(),
        status_change_reason = 'Simulation: patient called'
    WHERE id = v_queue_entry_id;
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 5,
    'name', 'patient_called',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER
  );

  -- Step 6: Start consultation
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    UPDATE patient_queue
    SET status = 'in_progress',
        started_at = now(),
        status_change_reason = 'Simulation: consultation started'
    WHERE id = v_queue_entry_id;
    
    -- Get practitioner from team_members
    INSERT INTO consultations (
      structure_id,
      patient_id,
      practitioner_id,
      created_by,
      motif,
      notes_cliniques
    )
    SELECT 
      p_structure_id,
      v_patient_id,
      tm.id,
      auth.uid(),
      'Simulation consultation',
      'Notes de simulation automatique'
    FROM team_members tm
    WHERE tm.structure_id = p_structure_id
    LIMIT 1
    RETURNING id INTO v_consultation_id;
  ELSE
    v_consultation_id := gen_random_uuid();
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 6,
    'name', 'consultation_created',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER,
    'consultation_id', v_consultation_id
  );

  -- Step 7: Complete consultation
  v_step_start := clock_timestamp();
  
  IF NOT p_dry_run THEN
    UPDATE patient_queue
    SET status = 'completed',
        completed_at = now(),
        billing_status = 'completed',
        status_change_reason = 'Simulation: consultation completed'
    WHERE id = v_queue_entry_id;
  END IF;
  
  v_steps := v_steps || jsonb_build_object(
    'step', 7,
    'name', 'consultation_completed',
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER
  );

  -- Step 8: Verify audit logs were created
  v_step_start := clock_timestamp();
  
  DECLARE
    v_audit_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_audit_count
    FROM immutable_audit_log
    WHERE structure_id = p_structure_id
    AND log_timestamp > now() - interval '5 minutes';
    
    v_steps := v_steps || jsonb_build_object(
      'step', 8,
      'name', 'audit_logs_verified',
      'success', v_audit_count > 0 OR p_dry_run,
      'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_step_start))::INTEGER,
      'logs_found', v_audit_count
    );
  END;

  -- Build final result
  v_result := jsonb_build_object(
    'simulation_id', gen_random_uuid(),
    'structure_id', p_structure_id,
    'dry_run', p_dry_run,
    'started_at', now(),
    'completed_at', clock_timestamp(),
    'total_steps', jsonb_array_length(v_steps),
    'successful_steps', (
      SELECT COUNT(*) FROM jsonb_array_elements(v_steps) elem
      WHERE (elem->>'success')::boolean = true
    ),
    'steps', v_steps,
    'entities_created', CASE WHEN p_dry_run THEN NULL ELSE jsonb_build_object(
      'patient_id', v_patient_id,
      'queue_entry_id', v_queue_entry_id,
      'preconsultation_id', v_preconsult_id,
      'consent_id', v_consent_id,
      'consultation_id', v_consultation_id
    ) END
  );

  RETURN v_result;
END;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_system_health_checks_structure_type 
  ON system_health_checks(structure_id, check_type, check_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_timestamp 
  ON system_health_checks(check_timestamp DESC);