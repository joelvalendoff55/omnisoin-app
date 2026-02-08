-- Attach audit triggers to additional sensitive tables

-- Trigger for patient_antecedents (medical history)
DROP TRIGGER IF EXISTS audit_patient_antecedents_changes ON public.patient_antecedents;
CREATE TRIGGER audit_patient_antecedents_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_antecedents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

-- Trigger for documents (patient documents)
DROP TRIGGER IF EXISTS audit_documents_changes ON public.documents;
CREATE TRIGGER audit_documents_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

-- Trigger for patient_consents (GDPR consents)
DROP TRIGGER IF EXISTS audit_patient_consents_changes ON public.patient_consents;
CREATE TRIGGER audit_patient_consents_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_changes();

-- Add comment for documentation
COMMENT ON TRIGGER audit_patient_antecedents_changes ON public.patient_antecedents IS 
  'Automatic audit logging for medical history changes - HAS compliance';

COMMENT ON TRIGGER audit_documents_changes ON public.documents IS 
  'Automatic audit logging for document changes - HAS/RGPD compliance';

COMMENT ON TRIGGER audit_patient_consents_changes ON public.patient_consents IS 
  'Automatic audit logging for consent changes - RGPD compliance';