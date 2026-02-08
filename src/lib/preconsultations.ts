import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type WaitingStatus = 'arrived' | 'waiting' | 'in_progress' | 'completed';
export type PreconsultationPriority = 'normal' | 'urgent' | 'emergency';

export interface Preconsultation {
  id: string;
  structure_id: string;
  patient_id: string;
  queue_entry_id: string | null;
  created_by: string;
  arrival_time: string;
  waiting_status: WaitingStatus;
  priority: PreconsultationPriority;
  initial_symptoms: string | null;
  vital_signs: Json;
  notes: string | null;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    dob: string | null;
  };
  creator?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface PreconsultationAudit {
  id: string;
  preconsultation_id: string;
  structure_id: string;
  action: string;
  previous_status: WaitingStatus | null;
  new_status: WaitingStatus | null;
  previous_priority: PreconsultationPriority | null;
  new_priority: PreconsultationPriority | null;
  changed_by: string;
  changed_by_role: string;
  change_reason: string | null;
  metadata: Json;
  changed_at: string;
}

export interface PreconsultationInsert {
  structure_id: string;
  patient_id: string;
  queue_entry_id?: string | null;
  created_by: string;
  priority?: PreconsultationPriority;
  initial_symptoms?: string;
  vital_signs?: Json;
  notes?: string;
}

export const WAITING_STATUS_CONFIG: Record<WaitingStatus, { label: string; color: string; icon: string }> = {
  arrived: { label: 'Arrivé', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'UserCheck' },
  waiting: { label: 'En attente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'Clock' },
  in_progress: { label: 'En cours', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'Stethoscope' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800 border-green-200', icon: 'CheckCircle' },
};

export const PRIORITY_CONFIG: Record<PreconsultationPriority, { label: string; color: string; bgColor: string }> = {
  normal: { label: 'Normal', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
  urgent: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200' },
  emergency: { label: 'Urgence', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
};

export async function fetchPreconsultations(structureId: string): Promise<Preconsultation[]> {
  const { data, error } = await supabase
    .from('preconsultations')
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, dob),
      creator:profiles!preconsultations_created_by_fkey(first_name, last_name)
    `)
    .eq('structure_id', structureId)
    .order('priority', { ascending: false })
    .order('arrival_time', { ascending: true });

  if (error) {
    console.error('Error fetching preconsultations:', error);
    throw error;
  }

  return (data || []) as unknown as Preconsultation[];
}

export async function fetchActivePreconsultations(structureId: string): Promise<Preconsultation[]> {
  const { data, error } = await supabase
    .from('preconsultations')
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, dob),
      creator:profiles!preconsultations_created_by_fkey(first_name, last_name)
    `)
    .eq('structure_id', structureId)
    .in('waiting_status', ['arrived', 'waiting', 'in_progress'])
    .order('priority', { ascending: false })
    .order('arrival_time', { ascending: true });

  if (error) {
    console.error('Error fetching active preconsultations:', error);
    throw error;
  }

  return (data || []) as unknown as Preconsultation[];
}

export async function createPreconsultation(data: PreconsultationInsert): Promise<Preconsultation> {
  const insertData = {
    structure_id: data.structure_id,
    patient_id: data.patient_id,
    queue_entry_id: data.queue_entry_id ?? null,
    created_by: data.created_by,
    priority: data.priority ?? 'normal',
    initial_symptoms: data.initial_symptoms ?? null,
    vital_signs: data.vital_signs ?? {},
    notes: data.notes ?? null,
  };

  const { data: result, error } = await supabase
    .from('preconsultations')
    .insert(insertData)
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, dob)
    `)
    .single();

  if (error) {
    console.error('Error creating preconsultation:', error);
    throw error;
  }

  return result as unknown as Preconsultation;
}

export async function updatePreconsultationStatus(
  id: string,
  status: WaitingStatus
): Promise<Preconsultation> {
  const updates: {
    waiting_status: WaitingStatus;
    started_at?: string;
    completed_at?: string;
  } = {
    waiting_status: status,
  };

  if (status === 'in_progress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('preconsultations')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, dob)
    `)
    .single();

  if (error) {
    console.error('Error updating preconsultation status:', error);
    throw error;
  }

  return data as unknown as Preconsultation;
}

export async function updatePreconsultationPriority(
  id: string,
  priority: PreconsultationPriority
): Promise<Preconsultation> {
  const { data, error } = await supabase
    .from('preconsultations')
    .update({ priority })
    .eq('id', id)
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, dob)
    `)
    .single();

  if (error) {
    console.error('Error updating preconsultation priority:', error);
    throw error;
  }

  return data as unknown as Preconsultation;
}

export async function updatePreconsultation(
  id: string,
  updates: {
    initial_symptoms?: string | null;
    vital_signs?: Json;
    notes?: string | null;
    assigned_to?: string | null;
  }
): Promise<Preconsultation> {
  const { data, error } = await supabase
    .from('preconsultations')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, dob)
    `)
    .single();

  if (error) {
    console.error('Error updating preconsultation:', error);
    throw error;
  }

  return data as unknown as Preconsultation;
}

export async function fetchPreconsultationAudit(preconsultationId: string): Promise<PreconsultationAudit[]> {
  const { data, error } = await supabase
    .from('preconsultation_audit')
    .select('*')
    .eq('preconsultation_id', preconsultationId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching preconsultation audit:', error);
    throw error;
  }

  return (data || []) as PreconsultationAudit[];
}

export function getWaitingDuration(arrivalTime: string): { minutes: number; formatted: string } {
  const arrival = new Date(arrivalTime);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 60) {
    return { minutes, formatted: `${minutes} min` };
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return {
    minutes,
    formatted: `${hours}h${remainingMinutes.toString().padStart(2, '0')}`,
  };
}
