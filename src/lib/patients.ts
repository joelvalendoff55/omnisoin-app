import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Patient, PatientFormData } from '@/types/patient';
import { logActivity } from '@/lib/activity';

export async function fetchPatients(includeArchived: boolean = false, structureId?: string | null) {
  let query = supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by structure_id if provided
  if (structureId) {
    query = query.eq('structure_id', structureId);
  }

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as Patient[];
}

export async function createPatient(
  patientData: PatientFormData,
  userId: string,
  structureId: string | null,
  options: { skipLog?: boolean } = {}
) {
  const { skipLog = false } = options;

  const { data, error } = await supabase
    .from('patients')
    .insert({
      first_name: patientData.first_name,
      last_name: patientData.last_name,
      dob: patientData.dob || null,
      sex: patientData.sex || null,
      phone: patientData.phone || null,
      email: patientData.email || null,
      primary_practitioner_user_id: patientData.primary_practitioner_user_id || null,
      note_admin: patientData.note_admin || null,
      origin: patientData.origin || 'spontanee',
      user_id: userId,
      structure_id: structureId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log activity (skip if caller will log a different action)
  if (structureId && !skipLog) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: 'PATIENT_CREATED',
      patientId: data.id,
      metadata: {
        first_name: patientData.first_name,
        last_name: patientData.last_name,
      },
    });
  }

  return data as Patient;
}

export async function updatePatient(
  patientId: string,
  patientData: PatientFormData,
  userId: string,
  structureId: string | null
) {
  const { data, error } = await supabase
    .from('patients')
    .update({
      first_name: patientData.first_name,
      last_name: patientData.last_name,
      dob: patientData.dob || null,
      sex: patientData.sex || null,
      phone: patientData.phone || null,
      email: patientData.email || null,
      primary_practitioner_user_id: patientData.primary_practitioner_user_id || null,
      note_admin: patientData.note_admin || null,
      origin: patientData.origin || null,
    })
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log activity
  if (structureId && userId) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: 'PATIENT_UPDATED',
      patientId,
      metadata: {
        updated_fields: Object.keys(patientData),
      },
    });
  }

  return data as Patient;
}

export async function archivePatient(
  patientId: string,
  archive: boolean,
  userId: string,
  structureId: string | null
) {
  const { data, error } = await supabase
    .from('patients')
    .update({
      is_archived: archive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log activity
  if (structureId && userId) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: archive ? 'PATIENT_ARCHIVED' : 'PATIENT_RESTORED',
      patientId,
    });
  }

  return data as Patient;
}
