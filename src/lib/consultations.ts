import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { logActivity } from './activity';

export interface Consultation {
  id: string;
  patient_id: string;
  practitioner_id: string;
  structure_id: string;
  consultation_date: string;
  motif: string | null;
  notes_cliniques: string | null;
  examen_clinique: string | null;
  conclusion: string | null;
  transcript_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  practitioner?: {
    first_name: string | null;
    last_name: string | null;
  };
  transcript?: {
    id: string;
    status: string;
    created_at: string;
  } | null;
}

export interface ConsultationFormData {
  consultation_date: Date;
  motif: string;
  notes_cliniques: string;
  examen_clinique: string;
  conclusion: string;
  transcript_id?: string | null;
}

export async function fetchConsultations(patientId: string): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      practitioner:profiles!practitioner_id (first_name, last_name),
      transcript:patient_transcripts!transcript_id (id, status, created_at)
    `)
    .eq('patient_id', patientId)
    .order('consultation_date', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as Consultation[];
}

export async function createConsultation(
  patientId: string,
  practitionerId: string,
  structureId: string,
  userId: string,
  formData: ConsultationFormData
): Promise<Consultation> {
  const { data, error } = await supabase
    .from('consultations')
    .insert({
      patient_id: patientId,
      practitioner_id: practitionerId,
      structure_id: structureId,
      consultation_date: formData.consultation_date.toISOString(),
      motif: formData.motif || null,
      notes_cliniques: formData.notes_cliniques || null,
      examen_clinique: formData.examen_clinique || null,
      conclusion: formData.conclusion || null,
      transcript_id: formData.transcript_id || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'CONSULTATION_CREATED',
    patientId,
    metadata: {
      consultation_id: data.id,
      motif: formData.motif,
    },
  });

  return data as Consultation;
}

export async function updateConsultation(
  consultationId: string,
  userId: string,
  structureId: string,
  patientId: string,
  formData: Partial<ConsultationFormData>
): Promise<Consultation> {
  const updateData: Record<string, unknown> = {};
  
  if (formData.consultation_date !== undefined) {
    updateData.consultation_date = formData.consultation_date.toISOString();
  }
  if (formData.motif !== undefined) updateData.motif = formData.motif || null;
  if (formData.notes_cliniques !== undefined) updateData.notes_cliniques = formData.notes_cliniques || null;
  if (formData.examen_clinique !== undefined) updateData.examen_clinique = formData.examen_clinique || null;
  if (formData.conclusion !== undefined) updateData.conclusion = formData.conclusion || null;
  if (formData.transcript_id !== undefined) updateData.transcript_id = formData.transcript_id || null;

  const { data, error } = await supabase
    .from('consultations')
    .update(updateData)
    .eq('id', consultationId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'CONSULTATION_UPDATED',
    patientId,
    metadata: { consultation_id: consultationId },
  });

  return data as Consultation;
}
