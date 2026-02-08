import { supabase } from '@/integrations/supabase/client';
import { logActivity } from './activity';

export type AntecedentType = 'medical' | 'chirurgical' | 'familial' | 'allergique' | 'traitement_en_cours';
export type AntecedentSeverity = 'leger' | 'modere' | 'severe';

export interface Antecedent {
  id: string;
  patient_id: string;
  structure_id: string;
  type: AntecedentType;
  description: string;
  date_debut: string | null;
  date_fin: string | null;
  actif: boolean;
  severity: AntecedentSeverity | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AntecedentFormData {
  type: AntecedentType;
  description: string;
  date_debut?: Date | null;
  date_fin?: Date | null;
  actif: boolean;
  severity?: AntecedentSeverity | null;
  notes?: string;
}

export const ANTECEDENT_TYPE_LABELS: Record<AntecedentType, string> = {
  medical: 'Médical',
  chirurgical: 'Chirurgical',
  familial: 'Familial',
  allergique: 'Allergie',
  traitement_en_cours: 'Traitement en cours',
};

export const SEVERITY_LABELS: Record<AntecedentSeverity, string> = {
  leger: 'Léger',
  modere: 'Modéré',
  severe: 'Sévère',
};

export const SEVERITY_COLORS: Record<AntecedentSeverity, string> = {
  leger: 'bg-green-100 text-green-800 border-green-300',
  modere: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  severe: 'bg-red-100 text-red-800 border-red-300',
};

export async function fetchAntecedents(patientId: string): Promise<Antecedent[]> {
  const { data, error } = await supabase
    .from('patient_antecedents')
    .select('*')
    .eq('patient_id', patientId)
    .order('actif', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as Antecedent[];
}

export async function createAntecedent(
  patientId: string,
  structureId: string,
  userId: string,
  formData: AntecedentFormData
): Promise<Antecedent> {
  const { data, error } = await supabase
    .from('patient_antecedents')
    .insert({
      patient_id: patientId,
      structure_id: structureId,
      type: formData.type,
      description: formData.description,
      date_debut: formData.date_debut?.toISOString().split('T')[0] || null,
      date_fin: formData.date_fin?.toISOString().split('T')[0] || null,
      actif: formData.actif,
      severity: formData.severity || null,
      notes: formData.notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'ANTECEDENT_CREATED',
    patientId,
    metadata: {
      antecedent_id: data.id,
      type: formData.type,
      description: formData.description,
    },
  });

  return data as unknown as Antecedent;
}

export async function updateAntecedent(
  antecedentId: string,
  userId: string,
  structureId: string,
  patientId: string,
  formData: Partial<AntecedentFormData>
): Promise<Antecedent> {
  const updateData: Record<string, unknown> = {};

  if (formData.type !== undefined) updateData.type = formData.type;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.date_debut !== undefined) {
    updateData.date_debut = formData.date_debut?.toISOString().split('T')[0] || null;
  }
  if (formData.date_fin !== undefined) {
    updateData.date_fin = formData.date_fin?.toISOString().split('T')[0] || null;
  }
  if (formData.actif !== undefined) updateData.actif = formData.actif;
  if (formData.severity !== undefined) updateData.severity = formData.severity || null;
  if (formData.notes !== undefined) updateData.notes = formData.notes || null;

  const { data, error } = await supabase
    .from('patient_antecedents')
    .update(updateData)
    .eq('id', antecedentId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'ANTECEDENT_UPDATED',
    patientId,
    metadata: { antecedent_id: antecedentId },
  });

  return data as unknown as Antecedent;
}

export async function deleteAntecedent(
  antecedentId: string,
  userId: string,
  structureId: string,
  patientId: string
): Promise<void> {
  const { error } = await supabase
    .from('patient_antecedents')
    .delete()
    .eq('id', antecedentId);

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'ANTECEDENT_DELETED',
    patientId,
    metadata: { antecedent_id: antecedentId },
  });
}
