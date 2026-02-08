import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import type { Json } from '@/integrations/supabase/types';

export interface QueueEntry {
  id: string;
  structure_id: string;
  patient_id: string;
  assigned_to: string | null;
  priority: number;
  status: string;
  arrival_time: string;
  checked_in_at: string | null;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  appointment_id: string | null;
  reason: string | null;
  reason_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // New workflow fields
  ready_at?: string | null;
  assistant_notes?: string | null;
  vitals_data?: Json | null;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  assigned_team_member?: {
    id: string;
    job_title: string;
    user_id: string;
  };
  consultation_reason?: {
    id: string;
    code: string;
    label: string;
    category: string;
    color: string | null;
  } | null;
}

export interface QueueEntryInsert {
  patient_id: string;
  structure_id: string;
  priority?: number;
  reason?: string;
  reason_id?: string | null;
  notes?: string;
  assigned_to?: string | null;
  assistant_notes?: string;
}

export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Urgent', color: 'destructive' },
  { value: 2, label: 'Prioritaire', color: 'warning' },
  { value: 3, label: 'Normal', color: 'secondary' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'present', label: 'Présent' },
  { value: 'waiting', label: 'En attente' },
  { value: 'called', label: 'Appelé' },
  { value: 'in_consultation', label: 'En consultation' },
  { value: 'awaiting_exam', label: 'Attente examen' },
  { value: 'completed', label: 'Terminé' },
  { value: 'closed', label: 'Clôturé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'no_show', label: 'Absent' },
] as const;

export async function fetchQueue(structureId: string, statusFilter?: string): Promise<QueueEntry[]> {
  let query = supabase
    .from('patient_queue')
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .eq('structure_id', structureId)
    .order('priority', { ascending: true })
    .order('arrival_time', { ascending: true });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching queue:', error);
    throw error;
  }

  return (data || []) as unknown as QueueEntry[];
}

export async function addToQueue(entry: QueueEntryInsert): Promise<QueueEntry> {
  const { data, error } = await supabase
    .from('patient_queue')
    .insert(entry)
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .single();

  if (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }

  return data as unknown as QueueEntry;
}

export async function updateQueueEntry(
  id: string,
  updates: Partial<Omit<QueueEntry, 'id' | 'structure_id' | 'created_at'>>
): Promise<QueueEntry> {
  const { data, error } = await supabase
    .from('patient_queue')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .single();

  if (error) {
    console.error('Error updating queue entry:', error);
    throw error;
  }

  return data as unknown as QueueEntry;
}

export async function callPatient(id: string, assignedTo?: string): Promise<QueueEntry> {
  return updateQueueEntry(id, {
    status: 'in_consultation',
    called_at: new Date().toISOString(),
    assigned_to: assignedTo || null,
  });
}

export async function completePatient(id: string): Promise<QueueEntry> {
  return updateQueueEntry(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
}

export async function cancelPatient(id: string): Promise<QueueEntry> {
  return updateQueueEntry(id, {
    status: 'cancelled',
    completed_at: new Date().toISOString(),
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const { error } = await supabase
    .from('patient_queue')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
}

export function getWaitingTime(arrivalTime: string): { minutes: number; formatted: string } {
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
    formatted: `${hours}h ${remainingMinutes}min` 
  };
}

export function getPriorityInfo(priority: number) {
  return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[2];
}
