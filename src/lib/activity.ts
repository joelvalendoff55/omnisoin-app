import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type ActivityAction =
  | 'PATIENT_CREATED'
  | 'PATIENT_UPDATED'
  | 'PATIENT_ARCHIVED'
  | 'PATIENT_RESTORED'
  | 'PATIENT_FILE_CLOSED'
  | 'PATIENT_FILE_REOPENED'
  | 'DELEGATION_CREATED'
  | 'DELEGATION_UPDATED'
  | 'DELEGATION_DELETED'
  | 'INBOX_ASSIGNED'
  | 'PATIENT_CREATED_FROM_INBOX'
  | 'TRANSCRIPT_UPLOADED'
  | 'TRANSCRIPTION_REQUESTED'
  | 'TRANSCRIPTION_READY'
  | 'TRANSCRIPTION_FAILED'
  | 'TRANSCRIPTION_LANGUAGE_SET'
  | 'TRANSCRIPT_SUMMARY_REQUESTED'
  | 'TRANSCRIPT_SUMMARY_READY'
  | 'TRANSCRIPT_SUMMARY_FAILED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_OCR_PROCESSED'
  | 'CONSULTATION_CREATED'
  | 'CONSULTATION_UPDATED'
  | 'ANTECEDENT_CREATED'
  | 'ANTECEDENT_UPDATED'
  | 'ANTECEDENT_DELETED'
  | 'HOSPITAL_PASSAGE_CREATED'
  | 'HOSPITAL_PASSAGE_UPDATED'
  | 'HOSPITAL_PASSAGE_DELETED'
  | 'patient_status_changed'
  | 'PATIENT_QUEUE_CLOSED'
  | 'PATIENT_QUEUE_ARCHIVED'
  | 'ATTEMPTED_ILLEGAL_DELETION'
  | 'RBAC_VIOLATION_ATTEMPT'
  | 'TRANSCRIPT_VALIDATED'
  | 'TRANSCRIPT_VALIDATION_REVOKED'
  | 'VITAL_SIGNS_RECORDED'
  | 'VITAL_SIGNS_UPDATED'
  | 'OCR_MEDICATIONS_IMPORTED'
  | 'OCR_DIAGNOSES_IMPORTED'
  | 'OCR_PROCEDURES_IMPORTED'
  | 'OCR_DATA_IMPORTED'
  | 'OCR_IMPORT_REVERTED'
  | 'OBSERVATION_CREATED'
  | 'OBSERVATION_UPDATED'
  | 'OBSERVATION_DELETED';

interface LogActivityParams {
  structureId: string;
  actorUserId: string;
  action: ActivityAction;
  patientId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity({
  structureId,
  actorUserId,
  action,
  patientId,
  metadata,
}: LogActivityParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('activity_logs').insert({
      structure_id: structureId,
      actor_user_id: actorUserId,
      action,
      patient_id: patientId || null,
      metadata: metadata || {},
    } as any);

    if (error) {
      console.warn('Failed to log activity:', error.message);
    }
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
}
