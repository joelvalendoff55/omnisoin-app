-- Sprint 5: Encryption + Multi-tenant Isolation
-- =============================================

-- 1. Create enum for key purposes
CREATE TYPE encryption_key_purpose AS ENUM (
  'consultation_data',
  'patient_records',
  'ai_analysis',
  'recordings'
);

-- 2. Create enum for data access action types
CREATE TYPE data_access_action AS ENUM (
  'read',
  'decrypt',
  'export',
  'print'
);

-- 3. Table encryption_keys - Stores encryption keys per structure
CREATE TABLE public.encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  key_purpose encryption_key_purpose NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  rotated_from UUID REFERENCES public.encryption_keys(id),
  UNIQUE(structure_id, key_purpose, key_version)
);

-- Add index for faster lookups
CREATE INDEX idx_encryption_keys_structure_purpose ON public.encryption_keys(structure_id, key_purpose, is_active);

-- RLS for encryption_keys - Only admin can read/write
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encryption_keys_select_admin"
  ON public.encryption_keys FOR SELECT
  USING (
    structure_id = get_user_structure_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "encryption_keys_insert_admin"
  ON public.encryption_keys FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
    AND created_by = auth.uid()
  );

CREATE POLICY "encryption_keys_update_admin"
  ON public.encryption_keys FOR UPDATE
  USING (
    structure_id = get_user_structure_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "encryption_keys_delete_admin"
  ON public.encryption_keys FOR DELETE
  USING (
    structure_id = get_user_structure_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Table data_access_log - Immutable audit of sensitive data access
CREATE TABLE public.data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  structure_id UUID NOT NULL REFERENCES public.structures(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  action_type data_access_action NOT NULL,
  fields_accessed TEXT[] NOT NULL DEFAULT '{}',
  access_reason TEXT NOT NULL,
  access_reason_category TEXT NOT NULL DEFAULT 'consultation',
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for data_access_log
CREATE INDEX idx_data_access_log_structure ON public.data_access_log(structure_id, accessed_at DESC);
CREATE INDEX idx_data_access_log_user ON public.data_access_log(user_id, accessed_at DESC);
CREATE INDEX idx_data_access_log_resource ON public.data_access_log(resource_type, resource_id);

-- RLS for data_access_log - Immutable, read-only for admins
ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_access_log_select_admin_coordinator"
  ON public.data_access_log FOR SELECT
  USING (
    (structure_id = get_user_structure_id(auth.uid()) 
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "data_access_log_insert_authenticated"
  ON public.data_access_log FOR INSERT
  WITH CHECK (
    structure_id = get_user_structure_id(auth.uid())
    AND user_id = auth.uid()
  );

-- Prevent any updates to audit log
CREATE POLICY "data_access_log_no_update"
  ON public.data_access_log FOR UPDATE
  USING (false);

-- Prevent any deletes from audit log
CREATE POLICY "data_access_log_no_delete"
  ON public.data_access_log FOR DELETE
  USING (false);

-- 5. Table encrypted_fields_registry - Tracks which fields require encryption
CREATE TABLE public.encrypted_fields_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  encryption_key_purpose encryption_key_purpose NOT NULL,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  sensitivity_level TEXT NOT NULL DEFAULT 'high',
  requires_justification BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(table_name, column_name)
);

-- RLS for encrypted_fields_registry
ALTER TABLE public.encrypted_fields_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encrypted_fields_select_authenticated"
  ON public.encrypted_fields_registry FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "encrypted_fields_modify_superadmin"
  ON public.encrypted_fields_registry FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 6. Table structure_isolation_alerts - Track cross-structure access attempts
CREATE TABLE public.structure_isolation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_by UUID NOT NULL,
  source_structure_id UUID NOT NULL,
  target_structure_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  alert_type TEXT NOT NULL DEFAULT 'cross_structure_attempt',
  severity TEXT NOT NULL DEFAULT 'high',
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_isolation_alerts_structure ON public.structure_isolation_alerts(source_structure_id, created_at DESC);

-- RLS for structure_isolation_alerts
ALTER TABLE public.structure_isolation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "isolation_alerts_select_admin"
  ON public.structure_isolation_alerts FOR SELECT
  USING (
    source_structure_id = get_user_structure_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "isolation_alerts_select_superadmin"
  ON public.structure_isolation_alerts FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "isolation_alerts_insert_system"
  ON public.structure_isolation_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "isolation_alerts_update_admin"
  ON public.structure_isolation_alerts FOR UPDATE
  USING (
    (source_structure_id = get_user_structure_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "isolation_alerts_no_delete"
  ON public.structure_isolation_alerts FOR DELETE
  USING (false);

-- 7. Function log_data_access() - For logging sensitive data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action_type data_access_action,
  p_fields_accessed TEXT[],
  p_access_reason TEXT,
  p_access_reason_category TEXT DEFAULT 'consultation'
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
  -- Get user's structure
  v_structure_id := get_user_structure_id(auth.uid());
  
  IF v_structure_id IS NULL THEN
    RAISE EXCEPTION 'User has no associated structure';
  END IF;
  
  -- Insert the access log
  INSERT INTO public.data_access_log (
    user_id,
    structure_id,
    resource_type,
    resource_id,
    action_type,
    fields_accessed,
    access_reason,
    access_reason_category,
    metadata
  ) VALUES (
    auth.uid(),
    v_structure_id,
    p_resource_type,
    p_resource_id,
    p_action_type,
    p_fields_accessed,
    p_access_reason,
    p_access_reason_category,
    jsonb_build_object(
      'timestamp', now(),
      'session_id', current_setting('request.jwt.claim.session_id', true)
    )
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 8. Function check_structure_isolation() - Verify structure isolation
CREATE OR REPLACE FUNCTION public.check_structure_isolation(
  p_table_name TEXT,
  p_resource_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_structure_id UUID;
  v_resource_structure_id UUID;
  v_query TEXT;
BEGIN
  -- Get user's structure
  v_user_structure_id := get_user_structure_id(auth.uid());
  
  -- Super admin can access all structures
  IF is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;
  
  IF v_user_structure_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Dynamic query to check structure_id of resource
  v_query := format(
    'SELECT structure_id FROM public.%I WHERE id = $1',
    p_table_name
  );
  
  BEGIN
    EXECUTE v_query INTO v_resource_structure_id USING p_resource_id;
  EXCEPTION WHEN OTHERS THEN
    -- Table might not have structure_id column
    RETURN true;
  END;
  
  IF v_resource_structure_id IS NULL THEN
    RETURN true; -- Resource doesn't exist or no structure_id
  END IF;
  
  -- Check if structures match
  IF v_resource_structure_id != v_user_structure_id THEN
    -- Log the cross-structure access attempt
    INSERT INTO public.structure_isolation_alerts (
      attempted_by,
      source_structure_id,
      target_structure_id,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      v_user_structure_id,
      v_resource_structure_id,
      p_table_name,
      p_resource_id,
      jsonb_build_object('attempted_at', now())
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 9. Function get_structure_isolation_status() - Get isolation health status
CREATE OR REPLACE FUNCTION public.get_structure_isolation_status(p_structure_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_alert_count INTEGER;
  v_recent_alerts INTEGER;
  v_unresolved_alerts INTEGER;
BEGIN
  -- Total alerts for this structure
  SELECT COUNT(*) INTO v_alert_count
  FROM public.structure_isolation_alerts
  WHERE source_structure_id = p_structure_id;
  
  -- Recent alerts (last 24 hours)
  SELECT COUNT(*) INTO v_recent_alerts
  FROM public.structure_isolation_alerts
  WHERE source_structure_id = p_structure_id
  AND created_at > now() - interval '24 hours';
  
  -- Unresolved alerts
  SELECT COUNT(*) INTO v_unresolved_alerts
  FROM public.structure_isolation_alerts
  WHERE source_structure_id = p_structure_id
  AND resolved = false;
  
  v_result := jsonb_build_object(
    'total_alerts', v_alert_count,
    'recent_alerts_24h', v_recent_alerts,
    'unresolved_alerts', v_unresolved_alerts,
    'status', CASE 
      WHEN v_unresolved_alerts > 0 THEN 'warning'
      WHEN v_recent_alerts > 0 THEN 'attention'
      ELSE 'healthy'
    END,
    'last_checked', now()
  );
  
  RETURN v_result;
END;
$$;

-- 10. Seed encrypted_fields_registry with sensitive fields
INSERT INTO public.encrypted_fields_registry (table_name, column_name, encryption_key_purpose, sensitivity_level, requires_justification)
VALUES 
  -- Consultations
  ('consultations', 'conclusion', 'consultation_data', 'critical', true),
  ('consultations', 'notes_cliniques', 'consultation_data', 'high', true),
  ('consultations', 'examen_clinique', 'consultation_data', 'high', true),
  ('consultations', 'motif', 'consultation_data', 'medium', false),
  
  -- Patient antecedents
  ('patient_antecedents', 'description', 'patient_records', 'critical', true),
  ('patient_antecedents', 'notes', 'patient_records', 'high', true),
  
  -- Patient transcripts
  ('patient_transcripts', 'transcript_text', 'recordings', 'critical', true),
  ('patient_transcripts', 'audio_path', 'recordings', 'critical', true),
  
  -- Consultation anamnesis (AI analysis)
  ('consultation_anamnesis', 'assistant_summary', 'ai_analysis', 'high', true),
  ('consultation_anamnesis', 'doctor_summary', 'ai_analysis', 'high', true),
  ('consultation_anamnesis', 'structured_data', 'ai_analysis', 'high', true),
  
  -- Preconsultations
  ('preconsultations', 'chief_complaint', 'patient_records', 'medium', false),
  ('preconsultations', 'vital_signs', 'patient_records', 'medium', false),
  
  -- Identities vault (already sensitive by design)
  ('identities_vault', 'first_name', 'patient_records', 'critical', true),
  ('identities_vault', 'last_name', 'patient_records', 'critical', true),
  ('identities_vault', 'nir', 'patient_records', 'critical', true),
  ('identities_vault', 'date_of_birth', 'patient_records', 'high', true),
  
  -- Hospital passages
  ('hospital_passages', 'diagnostics', 'consultation_data', 'critical', true),
  ('hospital_passages', 'traitements', 'consultation_data', 'high', true),
  ('hospital_passages', 'notes', 'consultation_data', 'medium', false)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- 11. Create view for encrypted fields with stats
CREATE OR REPLACE VIEW public.encrypted_fields_overview AS
SELECT 
  efr.table_name,
  efr.column_name,
  efr.encryption_key_purpose,
  efr.is_encrypted,
  efr.sensitivity_level,
  efr.requires_justification,
  (
    SELECT COUNT(*) 
    FROM public.data_access_log dal 
    WHERE dal.resource_type = efr.table_name 
    AND efr.column_name = ANY(dal.fields_accessed)
  ) as access_count_total
FROM public.encrypted_fields_registry efr
ORDER BY efr.sensitivity_level DESC, efr.table_name, efr.column_name;

-- Enable realtime for data_access_log (for admin monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_access_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.structure_isolation_alerts;