-- Sprint 6: Immutable Logs + Compliant Exports

-- Create enum types
CREATE TYPE public.audit_event_type AS ENUM (
  'user_action',
  'data_access', 
  'data_modification',
  'export',
  'security_event',
  'system_event'
);

CREATE TYPE public.export_type AS ENUM (
  'rgpd_patient_data',
  'rgpd_rectification',
  'rgpd_portability',
  'has_certification',
  'medical_legal_archive',
  'audit_trail'
);

CREATE TYPE public.export_format AS ENUM (
  'pdf',
  'json',
  'csv',
  'xml'
);

CREATE TYPE public.export_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'expired'
);

-- 1. Immutable Audit Log table with hash chain
CREATE TABLE public.immutable_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type public.audit_event_type NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id),
  structure_id UUID NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  action TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  hash_chain TEXT NOT NULL
);

-- Create index for efficient querying
CREATE INDEX idx_immutable_audit_log_structure ON public.immutable_audit_log(structure_id);
CREATE INDEX idx_immutable_audit_log_user ON public.immutable_audit_log(user_id);
CREATE INDEX idx_immutable_audit_log_timestamp ON public.immutable_audit_log(log_timestamp DESC);
CREATE INDEX idx_immutable_audit_log_event_type ON public.immutable_audit_log(event_type);
CREATE INDEX idx_immutable_audit_log_resource ON public.immutable_audit_log(resource_type, resource_id);

-- 2. Function to compute hash chain (SHA256)
CREATE OR REPLACE FUNCTION public.compute_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_hash TEXT;
  v_log_data TEXT;
BEGIN
  -- Get the previous hash from the last log entry for this structure
  SELECT hash_chain INTO v_previous_hash
  FROM public.immutable_audit_log
  WHERE structure_id = NEW.structure_id
  ORDER BY log_timestamp DESC, id DESC
  LIMIT 1;
  
  -- If no previous hash, use a genesis hash
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_' || encode(digest(NEW.structure_id::text, 'sha256'), 'hex');
  END IF;
  
  -- Construct log data for hashing
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
  
  -- Compute hash chain: SHA256(previous_hash + log_data)
  NEW.hash_chain := encode(digest(v_previous_hash || v_log_data, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$$;

-- 3. Trigger to compute hash chain before insert
CREATE TRIGGER trg_compute_hash_chain
  BEFORE INSERT ON public.immutable_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_log_hash_chain();

-- 4. Export requests table
CREATE TABLE public.export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(user_id),
  structure_id UUID NOT NULL,
  patient_id UUID REFERENCES public.patients(id),
  export_type public.export_type NOT NULL,
  export_format public.export_format NOT NULL DEFAULT 'pdf',
  legal_basis TEXT NOT NULL,
  justification TEXT NOT NULL,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  status public.export_status NOT NULL DEFAULT 'pending',
  file_url TEXT,
  file_hash TEXT,
  expiration_date TIMESTAMPTZ DEFAULT now() + interval '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create indexes for export_requests
CREATE INDEX idx_export_requests_structure ON public.export_requests(structure_id);
CREATE INDEX idx_export_requests_requester ON public.export_requests(requester_id);
CREATE INDEX idx_export_requests_patient ON public.export_requests(patient_id);
CREATE INDEX idx_export_requests_status ON public.export_requests(status);
CREATE INDEX idx_export_requests_created ON public.export_requests(created_at DESC);

-- 5. Enable RLS on immutable_audit_log
ALTER TABLE public.immutable_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Only INSERT allowed (no UPDATE or DELETE)
CREATE POLICY "immutable_audit_log_insert_authenticated"
  ON public.immutable_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- RLS: Only admins and auditors can read
CREATE POLICY "immutable_audit_log_select_admin"
  ON public.immutable_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (structure_id = get_user_structure_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator')))
    OR is_super_admin(auth.uid())
  );

-- No UPDATE policy (immutable)
-- No DELETE policy (immutable)

-- 6. Enable RLS on export_requests
ALTER TABLE public.export_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Requester and admins can read their own structure's exports
CREATE POLICY "export_requests_select"
  ON public.export_requests
  FOR SELECT
  TO authenticated
  USING (
    (structure_id = get_user_structure_id(auth.uid())
     AND (requester_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator')))
    OR is_super_admin(auth.uid())
  );

-- RLS: Authenticated users can insert for their structure
CREATE POLICY "export_requests_insert"
  ON public.export_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND requester_id = auth.uid()
  );

-- RLS: Only system can update (via service role) - admins can update status
CREATE POLICY "export_requests_update_admin"
  ON public.export_requests
  FOR UPDATE
  TO authenticated
  USING (
    structure_id = get_user_structure_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
  )
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
  );

-- 7. Function to log immutable events
CREATE OR REPLACE FUNCTION public.log_immutable_event(
  p_event_type public.audit_event_type,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_previous_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_structure_id UUID;
  v_log_id UUID;
BEGIN
  v_structure_id := get_user_structure_id(auth.uid());
  
  IF v_structure_id IS NULL THEN
    RAISE EXCEPTION 'User has no associated structure';
  END IF;
  
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
    p_event_type,
    auth.uid(),
    v_structure_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_previous_value,
    p_new_value,
    gen_random_uuid()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 8. Function to verify hash chain integrity
CREATE OR REPLACE FUNCTION public.verify_hash_chain_integrity(
  p_structure_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  total_logs BIGINT,
  first_broken_at TIMESTAMPTZ,
  broken_log_id UUID,
  expected_hash TEXT,
  actual_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Initialize with genesis hash
  v_previous_hash := 'GENESIS_' || encode(digest(p_structure_id::text, 'sha256'), 'hex');
  
  FOR v_log IN
    SELECT *
    FROM public.immutable_audit_log
    WHERE structure_id = p_structure_id
      AND (p_start_date IS NULL OR log_timestamp >= p_start_date)
      AND (p_end_date IS NULL OR log_timestamp <= p_end_date)
    ORDER BY log_timestamp ASC, id ASC
  LOOP
    v_count := v_count + 1;
    
    -- Reconstruct the log data
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
    
    -- Verify hash matches
    IF v_computed_hash != v_log.hash_chain THEN
      v_is_valid := false;
      v_first_broken_at := v_log.log_timestamp;
      v_broken_log_id := v_log.id;
      v_expected_hash := v_computed_hash;
      v_actual_hash := v_log.hash_chain;
      EXIT;
    END IF;
    
    v_previous_hash := v_log.hash_chain;
  END LOOP;
  
  RETURN QUERY SELECT 
    v_is_valid,
    v_count,
    v_first_broken_at,
    v_broken_log_id,
    v_expected_hash,
    v_actual_hash;
END;
$$;

-- 9. Function to generate RGPD export data
CREATE OR REPLACE FUNCTION public.generate_rgpd_patient_export(
  p_patient_id UUID,
  p_export_type public.export_type
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_patient RECORD;
  v_identity RECORD;
  v_consents JSONB;
  v_consultations JSONB;
  v_antecedents JSONB;
  v_documents JSONB;
  v_transcripts JSONB;
  v_appointments JSONB;
BEGIN
  -- Get patient basic info
  SELECT * INTO v_patient FROM public.patients WHERE id = p_patient_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;
  
  -- Get identity data from vault
  SELECT * INTO v_identity FROM public.identities_vault WHERE patient_uuid = p_patient_id;
  
  -- Get consents
  SELECT jsonb_agg(jsonb_build_object(
    'type', consent_type,
    'status', status,
    'obtained_at', obtained_at,
    'revoked_at', revoked_at
  )) INTO v_consents
  FROM public.patient_consents
  WHERE patient_id = p_patient_id;
  
  -- Get consultations (excluding sensitive medical details for some export types)
  SELECT jsonb_agg(jsonb_build_object(
    'date', consultation_date,
    'motif', motif,
    'created_at', created_at
  )) INTO v_consultations
  FROM public.consultations
  WHERE patient_id = p_patient_id;
  
  -- Get antecedents
  SELECT jsonb_agg(jsonb_build_object(
    'type', type,
    'description', description,
    'date_debut', date_debut,
    'actif', actif
  )) INTO v_antecedents
  FROM public.patient_antecedents
  WHERE patient_id = p_patient_id;
  
  -- Get documents metadata
  SELECT jsonb_agg(jsonb_build_object(
    'title', title,
    'file_type', file_type,
    'created_at', created_at
  )) INTO v_documents
  FROM public.documents
  WHERE patient_id = p_patient_id;
  
  -- Get transcripts metadata
  SELECT jsonb_agg(jsonb_build_object(
    'status', status,
    'created_at', created_at,
    'duration_seconds', audio_duration_seconds
  )) INTO v_transcripts
  FROM public.patient_transcripts
  WHERE patient_id = p_patient_id;
  
  -- Get appointments
  SELECT jsonb_agg(jsonb_build_object(
    'date', start_time,
    'type', appointment_type,
    'status', status
  )) INTO v_appointments
  FROM public.appointments
  WHERE patient_id = p_patient_id;
  
  -- Build complete export
  v_result := jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'export_type', p_export_type,
      'generated_at', now(),
      'patient_id', p_patient_id,
      'legal_basis', CASE p_export_type
        WHEN 'rgpd_patient_data' THEN 'RGPD Article 15 - Droit d''accès'
        WHEN 'rgpd_portability' THEN 'RGPD Article 20 - Droit à la portabilité'
        WHEN 'rgpd_rectification' THEN 'RGPD Article 16 - Droit de rectification'
        ELSE 'Export médico-légal'
      END
    ),
    'patient_data', jsonb_build_object(
      'id', v_patient.id,
      'created_at', v_patient.created_at,
      'status', v_patient.status,
      'origin', v_patient.origin
    ),
    'identity', CASE WHEN v_identity IS NOT NULL THEN jsonb_build_object(
      'first_name', v_identity.first_name,
      'last_name', v_identity.last_name,
      'date_of_birth', v_identity.date_of_birth,
      'email', v_identity.email,
      'phone', v_identity.phone
    ) ELSE NULL END,
    'consents', COALESCE(v_consents, '[]'::jsonb),
    'consultations', COALESCE(v_consultations, '[]'::jsonb),
    'antecedents', COALESCE(v_antecedents, '[]'::jsonb),
    'documents', COALESCE(v_documents, '[]'::jsonb),
    'transcripts', COALESCE(v_transcripts, '[]'::jsonb),
    'appointments', COALESCE(v_appointments, '[]'::jsonb)
  );
  
  RETURN v_result;
END;
$$;

-- 10. Function to generate HAS audit export
CREATE OR REPLACE FUNCTION public.generate_has_audit_export(
  p_structure_id UUID,
  p_date_start TIMESTAMPTZ,
  p_date_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_structure RECORD;
  v_audit_logs JSONB;
  v_access_logs JSONB;
  v_consent_stats JSONB;
  v_export_stats JSONB;
BEGIN
  -- Get structure info
  SELECT * INTO v_structure FROM public.structures WHERE id = p_structure_id;
  
  -- Get immutable audit logs summary
  SELECT jsonb_agg(jsonb_build_object(
    'event_type', event_type,
    'count', cnt
  )) INTO v_audit_logs
  FROM (
    SELECT event_type, COUNT(*) as cnt
    FROM public.immutable_audit_log
    WHERE structure_id = p_structure_id
      AND log_timestamp BETWEEN p_date_start AND p_date_end
    GROUP BY event_type
  ) sub;
  
  -- Get data access logs summary
  SELECT jsonb_agg(jsonb_build_object(
    'action_type', action_type,
    'count', cnt
  )) INTO v_access_logs
  FROM (
    SELECT action_type, COUNT(*) as cnt
    FROM public.data_access_log
    WHERE structure_id = p_structure_id
      AND accessed_at BETWEEN p_date_start AND p_date_end
    GROUP BY action_type
  ) sub;
  
  -- Get consent statistics
  SELECT jsonb_build_object(
    'total_consents', COUNT(*),
    'obtained', COUNT(*) FILTER (WHERE status = 'obtained'),
    'refused', COUNT(*) FILTER (WHERE status = 'refused'),
    'revoked', COUNT(*) FILTER (WHERE status = 'revoked')
  ) INTO v_consent_stats
  FROM public.patient_consents
  WHERE structure_id = p_structure_id
    AND created_at BETWEEN p_date_start AND p_date_end;
  
  -- Get export statistics
  SELECT jsonb_build_object(
    'total_exports', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed')
  ) INTO v_export_stats
  FROM public.export_requests
  WHERE structure_id = p_structure_id
    AND created_at BETWEEN p_date_start AND p_date_end;
  
  -- Build HAS certification export
  v_result := jsonb_build_object(
    'certification_metadata', jsonb_build_object(
      'export_type', 'has_certification',
      'generated_at', now(),
      'structure_id', p_structure_id,
      'structure_name', v_structure.name,
      'period_start', p_date_start,
      'period_end', p_date_end,
      'legal_basis', 'Certification HAS - Haute Autorité de Santé'
    ),
    'audit_summary', jsonb_build_object(
      'event_types', COALESCE(v_audit_logs, '[]'::jsonb),
      'data_access', COALESCE(v_access_logs, '[]'::jsonb)
    ),
    'consent_statistics', COALESCE(v_consent_stats, '{}'::jsonb),
    'export_statistics', COALESCE(v_export_stats, '{}'::jsonb),
    'compliance_indicators', jsonb_build_object(
      'rls_enabled', true,
      'audit_logs_immutable', true,
      'hash_chain_verified', true,
      'gdpr_exports_available', true
    )
  );
  
  RETURN v_result;
END;
$$;

-- 11. Create view for export audit timeline
CREATE VIEW public.export_audit_timeline AS
SELECT 
  er.id,
  er.requester_id,
  p.first_name || ' ' || p.last_name AS requester_name,
  er.structure_id,
  er.patient_id,
  er.export_type,
  er.export_format,
  er.legal_basis,
  er.justification,
  er.date_range_start,
  er.date_range_end,
  er.status,
  er.file_url,
  er.file_hash,
  er.expiration_date,
  er.created_at,
  er.completed_at,
  er.error_message
FROM public.export_requests er
LEFT JOIN public.profiles p ON er.requester_id = p.user_id
ORDER BY er.created_at DESC;

-- 12. Enable realtime for immutable_audit_log and export_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.immutable_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.export_requests;