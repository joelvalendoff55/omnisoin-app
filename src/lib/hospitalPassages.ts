import { supabase } from '@/integrations/supabase/client';
import { logActivity } from './activity';
import { Json } from '@/integrations/supabase/types';

export type PassageType = 'urgences' | 'hospitalisation';
export type RiskLevel = 'eleve' | 'modere' | 'standard';

export interface TacheVille {
  id: string;
  label: string;
  completed: boolean;
}

export interface HospitalPassage {
  id: string;
  patient_id: string;
  structure_id: string;
  passage_date: string;
  passage_type: PassageType;
  etablissement: string;
  risk_level: RiskLevel;
  motif: string | null;
  diagnostics: string | null;
  examens_cles: string | null;
  traitements: string | null;
  suivi_recommande: string | null;
  taches_ville: TacheVille[];
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HospitalPassageFormData {
  passage_date: Date;
  passage_type: PassageType;
  etablissement: string;
  risk_level: RiskLevel;
  motif?: string;
  diagnostics?: string;
  examens_cles?: string;
  traitements?: string;
  suivi_recommande?: string;
  taches_ville?: TacheVille[];
  notes?: string;
}

export const PASSAGE_TYPE_LABELS: Record<PassageType, string> = {
  urgences: 'Urgences',
  hospitalisation: 'Hospitalisation',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  eleve: 'Élevé',
  modere: 'Modéré',
  standard: 'Standard',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  eleve: 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400',
  modere: 'bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-400',
  standard: 'bg-muted text-muted-foreground',
};

function parseTachesVille(raw: Json | null): TacheVille[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, Json> => 
      typeof item === 'object' && 
      item !== null && 
      'id' in item && 
      'label' in item && 
      'completed' in item
    )
    .map(item => ({
      id: String(item.id),
      label: String(item.label),
      completed: Boolean(item.completed),
    }));
}

function mapRowToPassage(row: {
  id: string;
  patient_id: string;
  structure_id: string;
  passage_date: string;
  passage_type: string;
  etablissement: string;
  risk_level: string;
  motif: string | null;
  diagnostics: string | null;
  examens_cles: string | null;
  traitements: string | null;
  suivi_recommande: string | null;
  taches_ville: Json | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}): HospitalPassage {
  return {
    id: row.id,
    patient_id: row.patient_id,
    structure_id: row.structure_id,
    passage_date: row.passage_date,
    passage_type: row.passage_type as PassageType,
    etablissement: row.etablissement,
    risk_level: row.risk_level as RiskLevel,
    motif: row.motif,
    diagnostics: row.diagnostics,
    examens_cles: row.examens_cles,
    traitements: row.traitements,
    suivi_recommande: row.suivi_recommande,
    taches_ville: parseTachesVille(row.taches_ville),
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchHospitalPassages(patientId: string): Promise<HospitalPassage[]> {
  const { data, error } = await supabase
    .from('hospital_passages')
    .select('*')
    .eq('patient_id', patientId)
    .order('passage_date', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(mapRowToPassage);
}

export async function fetchHospitalPassageById(id: string): Promise<HospitalPassage | null> {
  const { data, error } = await supabase
    .from('hospital_passages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return mapRowToPassage(data);
}

export async function createHospitalPassage(
  patientId: string,
  structureId: string,
  userId: string,
  formData: HospitalPassageFormData
): Promise<HospitalPassage> {
  const insertPayload = {
    patient_id: patientId,
    structure_id: structureId,
    created_by: userId,
    passage_date: formData.passage_date.toISOString(),
    passage_type: formData.passage_type,
    etablissement: formData.etablissement,
    risk_level: formData.risk_level,
    motif: formData.motif || null,
    diagnostics: formData.diagnostics || null,
    examens_cles: formData.examens_cles || null,
    traitements: formData.traitements || null,
    suivi_recommande: formData.suivi_recommande || null,
    taches_ville: (formData.taches_ville || []) as unknown as Json,
    notes: formData.notes || null,
  };

  const { data, error } = await supabase
    .from('hospital_passages')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'HOSPITAL_PASSAGE_CREATED',
    patientId,
    metadata: { passage_id: data.id, etablissement: formData.etablissement },
  });

  return mapRowToPassage(data);
}

export async function updateHospitalPassage(
  id: string,
  userId: string,
  structureId: string,
  patientId: string,
  updates: Partial<HospitalPassageFormData>
): Promise<HospitalPassage> {
  const updatePayload: Record<string, unknown> = {};
  
  if (updates.passage_date) updatePayload.passage_date = updates.passage_date.toISOString();
  if (updates.passage_type) updatePayload.passage_type = updates.passage_type;
  if (updates.etablissement) updatePayload.etablissement = updates.etablissement;
  if (updates.risk_level) updatePayload.risk_level = updates.risk_level;
  if (updates.motif !== undefined) updatePayload.motif = updates.motif || null;
  if (updates.diagnostics !== undefined) updatePayload.diagnostics = updates.diagnostics || null;
  if (updates.examens_cles !== undefined) updatePayload.examens_cles = updates.examens_cles || null;
  if (updates.traitements !== undefined) updatePayload.traitements = updates.traitements || null;
  if (updates.suivi_recommande !== undefined) updatePayload.suivi_recommande = updates.suivi_recommande || null;
  if (updates.taches_ville !== undefined) updatePayload.taches_ville = updates.taches_ville as unknown as Json;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes || null;

  const { data, error } = await supabase
    .from('hospital_passages')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'HOSPITAL_PASSAGE_UPDATED',
    patientId,
    metadata: { passage_id: id },
  });

  return mapRowToPassage(data);
}

export async function updateTachesVille(
  id: string,
  taches: TacheVille[]
): Promise<void> {
  const { error } = await supabase
    .from('hospital_passages')
    .update({ taches_ville: taches as unknown as Json })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteHospitalPassage(
  id: string,
  userId: string,
  structureId: string,
  patientId: string
): Promise<void> {
  const { error } = await supabase
    .from('hospital_passages')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'HOSPITAL_PASSAGE_DELETED',
    patientId,
    metadata: { passage_id: id },
  });
}
