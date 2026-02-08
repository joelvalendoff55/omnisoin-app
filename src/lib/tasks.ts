import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface Task {
  id: string;
  structure_id: string;
  title: string;
  description: string | null;
  patient_id: string | null;
  assigned_to: string | null;
  created_by: string;
  status: string;
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  assigned_team_member?: {
    id: string;
    job_title: string;
    user_id: string;
  } | null;
}

export interface TaskInsert {
  structure_id: string;
  title: string;
  description?: string;
  patient_id?: string | null;
  assigned_to?: string | null;
  created_by: string;
  priority?: number;
  due_date?: string | null;
  category?: string | null;
}

export interface TaskFilters {
  status?: string;
  assigned_to?: string;
  category?: string;
  patient_id?: string;
}

export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Urgent', color: 'destructive' },
  { value: 2, label: 'Haute', color: 'warning' },
  { value: 3, label: 'Normale', color: 'secondary' },
  { value: 4, label: 'Basse', color: 'outline' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: 'administrative', label: 'Administratif' },
  { value: 'clinical', label: 'Clinique' },
  { value: 'followup', label: 'Suivi' },
  { value: 'other', label: 'Autre' },
] as const;

export async function fetchTasks(
  structureId: string,
  filters?: TaskFilters
): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .eq('structure_id', structureId)
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters?.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return (data || []) as unknown as Task[];
}

export async function fetchTaskById(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching task by ID:', error);
    throw error;
  }

  return data as unknown as Task;
}

export async function fetchTasksByTeamMember(teamMemberId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .eq('assigned_to', teamMemberId)
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching tasks by team member:', error);
    throw error;
  }

  return (data || []) as unknown as Task[];
}

export async function fetchTasksByPatient(patientId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks by patient:', error);
    throw error;
  }

  return (data || []) as unknown as Task[];
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  return data as unknown as Task;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'structure_id' | 'created_at' | 'created_by'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      assigned_team_member:team_members(id, job_title, user_id)
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  return data as unknown as Task;
}

export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

export function getPriorityInfo(priority: number) {
  return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[2];
}

export function getStatusInfo(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
}

export function getCategoryInfo(category: string | null) {
  if (!category) return null;
  return CATEGORY_OPTIONS.find(c => c.value === category);
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
