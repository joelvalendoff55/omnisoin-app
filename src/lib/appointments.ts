import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface Appointment {
  id: string;
  structure_id: string;
  patient_id: string | null;
  practitioner_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type: string;
  is_pdsa: boolean;
  location: string | null;
  notes: string | null;
  reminder_sent: boolean;
  reason_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  practitioner?: {
    id: string;
    user_id: string;
    job_title: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  consultation_reason?: {
    id: string;
    code: string;
    label: string;
    category: string;
    color: string | null;
  } | null;
}

export interface AppointmentFormData {
  patient_id?: string | null;
  practitioner_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  status?: string;
  appointment_type?: string;
  is_pdsa?: boolean;
  location?: string | null;
  notes?: string | null;
  reason_id?: string | null;
}

export const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Programmé' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'no_show', label: 'Absent' },
];

export const APPOINTMENT_TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'followup', label: 'Suivi' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'pdsa', label: 'PDSA' },
  { value: 'teleconsultation', label: 'Téléconsultation' },
  { value: 'other', label: 'Autre' },
];

export const LOCATION_OPTIONS = [
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'domicile', label: 'Domicile' },
  { value: 'teleconsultation', label: 'Téléconsultation' },
];

export function getStatusLabel(value: string): string {
  return STATUS_OPTIONS.find(s => s.value === value)?.label || value;
}

export function getTypeLabel(value: string): string {
  return APPOINTMENT_TYPE_OPTIONS.find(t => t.value === value)?.label || value;
}

export function getLocationLabel(value: string | null): string {
  if (!value) return '';
  return LOCATION_OPTIONS.find(l => l.value === value)?.label || value;
}

export function getTypeColor(type: string): string {
  switch (type) {
    case 'consultation': return 'bg-blue-500';
    case 'followup': return 'bg-green-500';
    case 'emergency': return 'bg-red-500';
    case 'pdsa': return 'bg-purple-500';
    case 'teleconsultation': return 'bg-cyan-500';
    default: return 'bg-gray-500';
  }
}

export async function fetchAppointments(
  structureId: string,
  startDate?: Date,
  endDate?: Date,
  practitionerId?: string
): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      practitioner:team_members(
        id, user_id, job_title,
        profile:profiles!team_members_user_id_fkey(first_name, last_name)
      )
    `)
    .eq('structure_id', structureId)
    .order('start_time', { ascending: true });

  if (startDate) {
    query = query.gte('start_time', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('start_time', endDate.toISOString());
  }
  if (practitionerId) {
    query = query.eq('practitioner_id', practitionerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    is_pdsa: item.is_pdsa ?? false,
    reminder_sent: item.reminder_sent ?? false,
    practitioner: item.practitioner ? {
      ...item.practitioner,
      profile: Array.isArray(item.practitioner.profile) 
        ? item.practitioner.profile[0] || null
        : item.practitioner.profile
    } : null
  })) as Appointment[];
}

export async function fetchAppointmentsForDay(
  structureId: string,
  date: Date,
  practitionerId?: string
): Promise<Appointment[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return fetchAppointments(structureId, startOfDay, endOfDay, practitionerId);
}

export async function fetchAppointmentsForWeek(
  structureId: string,
  weekStart: Date,
  practitionerId?: string
): Promise<Appointment[]> {
  const startOfWeek = new Date(weekStart);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return fetchAppointments(structureId, startOfWeek, endOfWeek, practitionerId);
}

export async function fetchAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      practitioner:team_members(
        id, user_id, job_title,
        profile:profiles!team_members_user_id_fkey(first_name, last_name)
      )
    `)
    .eq('patient_id', patientId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching patient appointments:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    is_pdsa: item.is_pdsa ?? false,
    reminder_sent: item.reminder_sent ?? false,
    practitioner: item.practitioner ? {
      ...item.practitioner,
      profile: Array.isArray(item.practitioner.profile) 
        ? item.practitioner.profile[0] || null
        : item.practitioner.profile
    } : null
  })) as Appointment[];
}

export async function fetchUpcomingAppointments(
  structureId: string,
  limit: number = 5
): Promise<Appointment[]> {
  const now = new Date();
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, first_name, last_name),
      practitioner:team_members(
        id, user_id, job_title,
        profile:profiles!team_members_user_id_fkey(first_name, last_name)
      )
    `)
    .eq('structure_id', structureId)
    .gte('start_time', now.toISOString())
    .in('status', ['scheduled', 'confirmed'])
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching upcoming appointments:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    is_pdsa: item.is_pdsa ?? false,
    reminder_sent: item.reminder_sent ?? false,
    practitioner: item.practitioner ? {
      ...item.practitioner,
      profile: Array.isArray(item.practitioner.profile) 
        ? item.practitioner.profile[0] || null
        : item.practitioner.profile
    } : null
  })) as Appointment[];
}

export async function createAppointment(
  structureId: string,
  userId: string,
  formData: AppointmentFormData
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      structure_id: structureId,
      created_by: userId,
      patient_id: formData.patient_id || null,
      practitioner_id: formData.practitioner_id,
      title: formData.title,
      description: formData.description || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      status: formData.status || 'scheduled',
      appointment_type: formData.appointment_type || 'consultation',
      is_pdsa: formData.is_pdsa || false,
      location: formData.location || null,
      notes: formData.notes || null,
      reason_id: formData.reason_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }

  return { ...data, is_pdsa: data.is_pdsa ?? false, reminder_sent: data.reminder_sent ?? false } as Appointment;
}

export async function updateAppointment(
  id: string,
  formData: Partial<AppointmentFormData>
): Promise<Appointment> {
  const updateData: Record<string, unknown> = {};
  
  if (formData.patient_id !== undefined) updateData.patient_id = formData.patient_id || null;
  if (formData.practitioner_id !== undefined) updateData.practitioner_id = formData.practitioner_id;
  if (formData.title !== undefined) updateData.title = formData.title;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.start_time !== undefined) updateData.start_time = formData.start_time;
  if (formData.end_time !== undefined) updateData.end_time = formData.end_time;
  if (formData.status !== undefined) updateData.status = formData.status;
  if (formData.appointment_type !== undefined) updateData.appointment_type = formData.appointment_type;
  if (formData.is_pdsa !== undefined) updateData.is_pdsa = formData.is_pdsa;
  if (formData.location !== undefined) updateData.location = formData.location;
  if (formData.notes !== undefined) updateData.notes = formData.notes;
  if (formData.reason_id !== undefined) updateData.reason_id = formData.reason_id;

  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }

  return { ...data, is_pdsa: data.is_pdsa ?? false, reminder_sent: data.reminder_sent ?? false } as Appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  return updateAppointment(id, { status: 'cancelled' });
}

export async function completeAppointment(id: string): Promise<Appointment> {
  return updateAppointment(id, { status: 'completed' });
}
