import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { logActivity } from './activity';

export interface ConsultationObservation {
  id: string;
  consultation_id: string | null;
  patient_id: string;
  structure_id: string;
  author_id: string;
  author_role: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface ConsultationObservationFormData {
  content: string;
  consultation_id?: string | null;
}

export async function fetchConsultationObservations(
  patientId: string,
  consultationId?: string
): Promise<ConsultationObservation[]> {
  let query = supabase
    .from('consultation_observations')
    .select(`
      *,
      author:profiles!author_id (first_name, last_name)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (consultationId) {
    query = query.eq('consultation_id', consultationId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as unknown as ConsultationObservation[];
}

export async function createConsultationObservation(
  patientId: string,
  structureId: string,
  userId: string,
  userRole: string,
  formData: ConsultationObservationFormData
): Promise<ConsultationObservation> {
  const { data, error } = await supabase
    .from('consultation_observations')
    .insert({
      patient_id: patientId,
      structure_id: structureId,
      author_id: userId,
      author_role: userRole,
      content: formData.content,
      consultation_id: formData.consultation_id || null,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'OBSERVATION_CREATED',
    patientId,
    metadata: {
      observation_id: data.id,
      role: userRole,
    },
  });

  return data as ConsultationObservation;
}

export async function updateConsultationObservation(
  observationId: string,
  userId: string,
  structureId: string,
  patientId: string,
  content: string
): Promise<ConsultationObservation> {
  const { data, error } = await supabase
    .from('consultation_observations')
    .update({ content })
    .eq('id', observationId)
    .eq('author_id', userId) // Only author can update
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'OBSERVATION_UPDATED',
    patientId,
    metadata: { observation_id: observationId },
  });

  return data as ConsultationObservation;
}

export async function deleteConsultationObservation(
  observationId: string,
  userId: string,
  structureId: string,
  patientId: string
): Promise<void> {
  const { error } = await supabase
    .from('consultation_observations')
    .delete()
    .eq('id', observationId);

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'OBSERVATION_DELETED',
    patientId,
    metadata: { observation_id: observationId },
  });
}
