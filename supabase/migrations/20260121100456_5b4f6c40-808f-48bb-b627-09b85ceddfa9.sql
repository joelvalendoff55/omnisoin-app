-- Create GDPR audit log table for vault access and pseudonymization tracking
CREATE TABLE public.gdpr_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  structure_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'vault_access', 'vault_create', 'vault_update', 'pseudonymization', 'data_export', 'deletion_request'
  target_type text NOT NULL, -- 'identity', 'medical_record', 'patient', 'transcript'
  target_id uuid, -- ID of the accessed/modified record
  patient_uuid uuid, -- Link to patient (for cross-reference)
  details jsonb DEFAULT '{}'::jsonb, -- Additional context (masked fields, export type, etc.)
  ip_address text, -- For compliance tracking
  user_agent text, -- Browser/client info
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gdpr_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins and coordinators can view audit logs
CREATE POLICY "gdpr_audit_select_admin_coordinator"
ON public.gdpr_audit_logs
FOR SELECT
USING (
  structure_id = get_user_structure_id(auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
);

-- Anyone in structure can insert logs (for tracking their own actions)
CREATE POLICY "gdpr_audit_insert_same_structure"
ON public.gdpr_audit_logs
FOR INSERT
WITH CHECK (
  structure_id = get_user_structure_id(auth.uid())
  AND actor_user_id = auth.uid()
);

-- Audit logs are immutable - no updates or deletes
CREATE POLICY "gdpr_audit_no_update"
ON public.gdpr_audit_logs
FOR UPDATE
USING (false);

CREATE POLICY "gdpr_audit_no_delete"
ON public.gdpr_audit_logs
FOR DELETE
USING (false);

-- Indexes for efficient querying
CREATE INDEX idx_gdpr_audit_structure ON public.gdpr_audit_logs(structure_id);
CREATE INDEX idx_gdpr_audit_actor ON public.gdpr_audit_logs(actor_user_id);
CREATE INDEX idx_gdpr_audit_action ON public.gdpr_audit_logs(action_type);
CREATE INDEX idx_gdpr_audit_created ON public.gdpr_audit_logs(created_at DESC);
CREATE INDEX idx_gdpr_audit_patient ON public.gdpr_audit_logs(patient_uuid);