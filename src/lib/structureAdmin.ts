import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
export interface StructureSettings {
  id: string;
  structure_id: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  siret: string | null;
  specialty: string | null;
  capacity: number;
  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  id: string;
  structure_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  break_start: string | null;
  break_end: string | null;
}

export interface PractitionerSchedule {
  id: string;
  structure_id: string;
  team_member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface PractitionerAbsence {
  id: string;
  structure_id: string;
  team_member_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  absence_type: string;
  created_by: string | null;
  created_at: string;
}

export interface QueuePriorityLevel {
  id: string;
  structure_id: string;
  level: number;
  label: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
}

export interface AdminDashboardStats {
  patientsToday: number;
  consultationsThisWeek: number;
  avgWaitTimeMinutes: number;
  consultationsLast30Days: { date: string; count: number }[];
  peakHours: { hour: number; count: number }[];
}

// Day labels
export const DAY_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

export const ABSENCE_TYPES = [
  { value: 'conge', label: 'Congé' },
  { value: 'maladie', label: 'Maladie' },
  { value: 'formation', label: 'Formation' },
  { value: 'autre', label: 'Autre' },
];

// Fetch structure settings
export async function fetchStructureSettings(structureId: string): Promise<StructureSettings | null> {
  const { data, error } = await supabase
    .from('structure_settings')
    .select('*')
    .eq('structure_id', structureId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching structure settings:', error);
    return null;
  }

  return data as StructureSettings | null;
}

// Upsert structure settings
export async function upsertStructureSettings(
  structureId: string,
  settings: Partial<StructureSettings>
): Promise<StructureSettings> {
  const { data, error } = await supabase
    .from('structure_settings')
    .upsert({
      structure_id: structureId,
      ...settings,
    }, { onConflict: 'structure_id' })
    .select()
    .single();

  if (error) throw error;
  return data as StructureSettings;
}

// Fetch opening hours
export async function fetchOpeningHours(structureId: string): Promise<OpeningHours[]> {
  const { data, error } = await supabase
    .from('structure_opening_hours')
    .select('*')
    .eq('structure_id', structureId)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('Error fetching opening hours:', error);
    return [];
  }

  return data as OpeningHours[];
}

// Upsert opening hours
export async function upsertOpeningHours(
  structureId: string,
  dayOfWeek: number,
  hours: Partial<OpeningHours>
): Promise<OpeningHours> {
  const { data, error } = await supabase
    .from('structure_opening_hours')
    .upsert({
      structure_id: structureId,
      day_of_week: dayOfWeek,
      ...hours,
    }, { onConflict: 'structure_id,day_of_week' })
    .select()
    .single();

  if (error) throw error;
  return data as OpeningHours;
}

// Fetch priority levels
export async function fetchPriorityLevels(structureId: string): Promise<QueuePriorityLevel[]> {
  const { data, error } = await supabase
    .from('queue_priority_levels')
    .select('*')
    .eq('structure_id', structureId)
    .order('level', { ascending: true });

  if (error) {
    console.error('Error fetching priority levels:', error);
    return [];
  }

  return data as QueuePriorityLevel[];
}

// Update priority level
export async function updatePriorityLevel(
  id: string,
  updates: Partial<QueuePriorityLevel>
): Promise<QueuePriorityLevel> {
  const { data, error } = await supabase
    .from('queue_priority_levels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as QueuePriorityLevel;
}

// Fetch practitioner schedules
export async function fetchPractitionerSchedules(structureId: string): Promise<PractitionerSchedule[]> {
  const { data, error } = await supabase
    .from('practitioner_schedules')
    .select('*')
    .eq('structure_id', structureId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('Error fetching practitioner schedules:', error);
    return [];
  }

  return data as PractitionerSchedule[];
}

// Create practitioner schedule
export async function createPractitionerSchedule(
  structureId: string,
  schedule: Omit<PractitionerSchedule, 'id' | 'structure_id' | 'is_active'>
): Promise<PractitionerSchedule> {
  const { data, error } = await supabase
    .from('practitioner_schedules')
    .insert({
      structure_id: structureId,
      ...schedule,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PractitionerSchedule;
}

// Delete practitioner schedule
export async function deletePractitionerSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('practitioner_schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Fetch practitioner absences
export async function fetchPractitionerAbsences(structureId: string): Promise<PractitionerAbsence[]> {
  const { data, error } = await supabase
    .from('practitioner_absences')
    .select('*')
    .eq('structure_id', structureId)
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching practitioner absences:', error);
    return [];
  }

  return data as PractitionerAbsence[];
}

// Create practitioner absence
export async function createPractitionerAbsence(
  structureId: string,
  absence: Omit<PractitionerAbsence, 'id' | 'structure_id' | 'created_at' | 'created_by'>
): Promise<PractitionerAbsence> {
  const { data, error } = await supabase
    .from('practitioner_absences')
    .insert({
      structure_id: structureId,
      ...absence,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PractitionerAbsence;
}

// Delete practitioner absence
export async function deletePractitionerAbsence(id: string): Promise<void> {
  const { error } = await supabase
    .from('practitioner_absences')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Find appointments affected by an absence and notify patients
export async function notifyPatientsForAbsence(
  structureId: string,
  teamMemberId: string,
  startDate: string,
  endDate: string,
  practitionerName: string
): Promise<number> {
  // Find appointments during the absence period
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      start_time,
      patient:patients(id, first_name, last_name)
    `)
    .eq('structure_id', structureId)
    .eq('practitioner_id', teamMemberId)
    .gte('start_time', `${startDate}T00:00:00`)
    .lte('start_time', `${endDate}T23:59:59`)
    .in('status', ['scheduled', 'confirmed']);

  if (appointmentsError) {
    console.error('Error fetching affected appointments:', appointmentsError);
    return 0;
  }

  if (!appointments || appointments.length === 0) {
    return 0;
  }

  // Get unique patient IDs and their user IDs from profiles
  const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];
  
  // Create notifications for each affected patient
  const notifications = appointments.map(appointment => {
    const patient = appointment.patient as { first_name: string; last_name: string } | null;
    const appointmentDate = format(new Date(appointment.start_time), 'dd/MM/yyyy à HH:mm', { locale: fr });
    
    return {
      structure_id: structureId,
      user_id: appointment.patient_id, // Note: This assumes patient_id maps to user_id for notification
      title: 'Rendez-vous à reporter',
      message: `${practitionerName} sera absent(e). Votre RDV du ${appointmentDate} doit être reporté.`,
      type: 'warning',
      link: '/agenda',
    };
  }).filter(n => n.user_id);

  if (notifications.length === 0) {
    return 0;
  }

  // Insert notifications in batch
  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('Error creating notifications:', notifError);
    return 0;
  }

  return notifications.length;
}

// Upload structure logo
export async function uploadStructureLogo(structureId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${structureId}/logo.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('structure-logos')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('structure-logos')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// Fetch admin dashboard stats
export async function fetchAdminDashboardStats(structureId: string): Promise<AdminDashboardStats> {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
  const thirtyDaysAgo = subDays(today, 30);

  // Patients today (from queue)
  const { count: patientsToday } = await supabase
    .from('patient_queue')
    .select('id', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .gte('arrival_time', startOfToday.toISOString())
    .lte('arrival_time', endOfToday.toISOString());

  // Consultations this week
  const { count: consultationsThisWeek } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .gte('consultation_date', startOfThisWeek.toISOString())
    .lte('consultation_date', endOfThisWeek.toISOString());

  // Average wait time (last 7 days)
  const { data: waitTimeData } = await supabase
    .from('patient_queue')
    .select('arrival_time, called_at')
    .eq('structure_id', structureId)
    .not('called_at', 'is', null)
    .gte('arrival_time', subDays(today, 7).toISOString());

  let avgWaitTimeMinutes = 0;
  if (waitTimeData && waitTimeData.length > 0) {
    const totalWaitTime = waitTimeData.reduce((sum, entry) => {
      const arrival = new Date(entry.arrival_time);
      const called = new Date(entry.called_at!);
      return sum + (called.getTime() - arrival.getTime()) / 60000;
    }, 0);
    avgWaitTimeMinutes = Math.round(totalWaitTime / waitTimeData.length);
  }

  // Consultations last 30 days
  const { data: consultationsData } = await supabase
    .from('consultations')
    .select('consultation_date')
    .eq('structure_id', structureId)
    .gte('consultation_date', thirtyDaysAgo.toISOString())
    .order('consultation_date', { ascending: true });

  const consultationsLast30Days: { date: string; count: number }[] = [];
  const consultationsByDate = new Map<string, number>();

  consultationsData?.forEach((c) => {
    const date = format(new Date(c.consultation_date), 'yyyy-MM-dd');
    consultationsByDate.set(date, (consultationsByDate.get(date) || 0) + 1);
  });

  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    consultationsLast30Days.push({
      date,
      count: consultationsByDate.get(date) || 0,
    });
  }

  // Peak hours (last 7 days)
  const { data: queueData } = await supabase
    .from('patient_queue')
    .select('arrival_time')
    .eq('structure_id', structureId)
    .gte('arrival_time', subDays(today, 7).toISOString());

  const hourCounts = new Map<number, number>();
  queueData?.forEach((entry) => {
    const hour = new Date(entry.arrival_time).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  const peakHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  return {
    patientsToday: patientsToday || 0,
    consultationsThisWeek: consultationsThisWeek || 0,
    avgWaitTimeMinutes,
    consultationsLast30Days,
    peakHours,
  };
}

// Export stats to CSV
export function exportStatsToCSV(stats: AdminDashboardStats): string {
  const lines: string[] = [];
  
  lines.push('Statistiques de la Structure');
  lines.push('');
  lines.push('Résumé');
  lines.push(`Patients du jour,${stats.patientsToday}`);
  lines.push(`Consultations cette semaine,${stats.consultationsThisWeek}`);
  lines.push(`Temps d'attente moyen (min),${stats.avgWaitTimeMinutes}`);
  lines.push('');
  lines.push('Consultations des 30 derniers jours');
  lines.push('Date,Nombre');
  stats.consultationsLast30Days.forEach((d) => {
    lines.push(`${d.date},${d.count}`);
  });
  lines.push('');
  lines.push('Pics d\'affluence (7 derniers jours)');
  lines.push('Heure,Nombre de patients');
  stats.peakHours.forEach((h) => {
    lines.push(`${h.hour}h,${h.count}`);
  });

  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
