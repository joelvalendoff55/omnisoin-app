import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { logActivity } from '@/lib/activity';

export type PatientFileStatus = 'actif' | 'clos';

export type PatientOrigin = 'spontanee' | 'samu' | 'hopital' | 'confrere' | 'autre';

export const PATIENT_ORIGIN_OPTIONS = [
  { value: 'spontanee', label: 'Venue spontanée' },
  { value: 'samu', label: 'Adressage SAMU' },
  { value: 'hopital', label: 'Adressage Hôpital' },
  { value: 'confrere', label: 'Adressage Confrère' },
  { value: 'autre', label: 'Autre' },
] as const;

export const PATIENT_STATUS_OPTIONS = [
  { value: 'actif', label: 'Actif', color: 'green' },
  { value: 'clos', label: 'Clôturé', color: 'gray' },
] as const;

export function getOriginLabel(origin: PatientOrigin | string | null): string {
  if (!origin) return 'Non renseignée';
  const found = PATIENT_ORIGIN_OPTIONS.find(o => o.value === origin);
  return found?.label || origin;
}

export function getStatusLabel(status: PatientFileStatus | string | null): string {
  if (!status) return 'Actif';
  const found = PATIENT_STATUS_OPTIONS.find(s => s.value === status);
  return found?.label || status;
}

interface ClosePatientFileParams {
  patientId: string;
  closedByUserId: string;
  structureId: string;
}

/**
 * Close a patient file - only doctors can do this
 */
export async function closePatientFile({
  patientId,
  closedByUserId,
  structureId,
}: ClosePatientFileParams) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('patients')
    .update({
      status: 'clos',
      closed_at: now,
      closed_by: closedByUserId,
      updated_at: now,
    })
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log activity
  await logActivity({
    structureId,
    actorUserId: closedByUserId,
    action: 'PATIENT_FILE_CLOSED',
    patientId,
    metadata: {
      closed_at: now,
    },
  });

  return data;
}

/**
 * Reopen a closed patient file - only doctors can do this
 */
export async function reopenPatientFile({
  patientId,
  reopenedByUserId,
  structureId,
}: {
  patientId: string;
  reopenedByUserId: string;
  structureId: string;
}) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('patients')
    .update({
      status: 'actif',
      closed_at: null,
      closed_by: null,
      updated_at: now,
    })
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log activity
  await logActivity({
    structureId,
    actorUserId: reopenedByUserId,
    action: 'PATIENT_FILE_REOPENED',
    patientId,
    metadata: {
      reopened_at: now,
    },
  });

  return data;
}
