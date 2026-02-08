import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, format } from 'date-fns';

export interface TodayStats {
  patientsToday: number;
  queueWaiting: number;
  queueInProgress: number;
  appointmentsToday: number;
  appointmentsCompleted: number;
  tasksPending: number;
  averageWaitTime: number;
}

export interface WeeklyActivity {
  day: string;
  dayLabel: string;
  consultations: number;
  avgWaitTime: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  created_at: string;
  patient_id: string | null;
  patient_name: string | null;
  actor_user_id: string;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
}

export async function getTodayStats(structureId: string): Promise<TodayStats> {
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const [
    patientsTodayRes,
    queueRes,
    appointmentsTodayRes,
    appointmentsCompletedRes,
    tasksPendingRes,
    waitTimeRes,
  ] = await Promise.all([
    // Patients seen today (completed queue entries)
    supabase
      .from('patient_queue')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('status', 'completed')
      .gte('completed_at', todayStart)
      .lte('completed_at', todayEnd),

    // Queue: waiting and in_consultation
    supabase
      .from('patient_queue')
      .select('status')
      .eq('structure_id', structureId)
      .in('status', ['waiting', 'called', 'in_consultation']),

    // Appointments today
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd),

    // Appointments completed today
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('status', 'completed')
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd),

    // Pending tasks
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('status', 'pending'),

    // Average wait time for completed entries today
    supabase
      .from('patient_queue')
      .select('arrival_time, called_at')
      .eq('structure_id', structureId)
      .not('called_at', 'is', null)
      .gte('arrival_time', todayStart)
      .lte('arrival_time', todayEnd),
  ]);

  // Calculate queue counts
  const queueData = queueRes.data || [];
  const queueWaiting = queueData.filter(q => q.status === 'waiting' || q.status === 'called').length;
  const queueInProgress = queueData.filter(q => q.status === 'in_consultation').length;

  // Calculate average wait time
  let averageWaitTime = 0;
  if (waitTimeRes.data && waitTimeRes.data.length > 0) {
    const waitTimes = waitTimeRes.data
      .filter(entry => entry.arrival_time && entry.called_at)
      .map(entry => {
        const arrival = new Date(entry.arrival_time!).getTime();
        const called = new Date(entry.called_at!).getTime();
        return Math.floor((called - arrival) / 60000); // minutes
      });
    if (waitTimes.length > 0) {
      averageWaitTime = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
    }
  }

  return {
    patientsToday: patientsTodayRes.count || 0,
    queueWaiting,
    queueInProgress,
    appointmentsToday: appointmentsTodayRes.count || 0,
    appointmentsCompleted: appointmentsCompletedRes.count || 0,
    tasksPending: tasksPendingRes.count || 0,
    averageWaitTime,
  };
}

export async function getWeeklyActivity(structureId: string): Promise<WeeklyActivity[]> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  // Get all completed queue entries for the week
  const { data: queueData } = await supabase
    .from('patient_queue')
    .select('completed_at, arrival_time, called_at')
    .eq('structure_id', structureId)
    .eq('status', 'completed')
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString());

  // Group by day
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const weeklyData: WeeklyActivity[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = format(day, 'yyyy-MM-dd');

    const dayEntries = (queueData || []).filter(entry => {
      if (!entry.completed_at) return false;
      return format(new Date(entry.completed_at), 'yyyy-MM-dd') === dayStr;
    });

    // Calculate average wait time for the day
    const waitTimes = dayEntries
      .filter(entry => entry.arrival_time && entry.called_at)
      .map(entry => {
        const arrival = new Date(entry.arrival_time!).getTime();
        const called = new Date(entry.called_at!).getTime();
        return Math.floor((called - arrival) / 60000);
      });

    const avgWaitTime = waitTimes.length > 0
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;

    weeklyData.push({
      day: dayStr,
      dayLabel: dayLabels[i],
      consultations: dayEntries.length,
      avgWaitTime,
    });
  }

  return weeklyData;
}

export async function getRecentActivity(
  structureId: string,
  limit: number = 10
): Promise<RecentActivityItem[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      id,
      action,
      created_at,
      patient_id,
      actor_user_id,
      metadata,
      patient:patients(first_name, last_name)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }

  // Fetch actor names
  const actorIds = [...new Set((data || []).map(d => d.actor_user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', actorIds);

  const profileMap = new Map(
    (profiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
  );

  return (data || []).map((item: any) => ({
    id: item.id,
    action: item.action,
    created_at: item.created_at,
    patient_id: item.patient_id,
    patient_name: item.patient
      ? `${item.patient.first_name} ${item.patient.last_name}`
      : null,
    actor_user_id: item.actor_user_id,
    actor_name: profileMap.get(item.actor_user_id) || null,
    metadata: item.metadata,
  }));
}

// Action labels for display
export const ACTION_LABELS: Record<string, string> = {
  PATIENT_CREATED: 'Patient créé',
  PATIENT_UPDATED: 'Patient modifié',
  PATIENT_ARCHIVED: 'Patient archivé',
  PATIENT_RESTORED: 'Patient restauré',
  queue_arrival: 'Arrivée patient',
  queue_present: 'Patient présent',
  queue_called: 'Patient appelé',
  queue_in_consultation: 'Prise en charge',
  queue_completed: 'Consultation terminée',
  queue_closed: 'Dossier clôturé',
  queue_cancelled: 'Visite annulée',
  queue_no_show: 'Patient absent',
  queue_requeued: 'Remis en file',
  team_member_created: 'Membre ajouté',
  team_member_updated: 'Membre modifié',
  team_member_deleted: 'Membre supprimé',
  DELEGATION_CREATED: 'Délégation créée',
  DELEGATION_DELETED: 'Délégation supprimée',
  TRANSCRIPTION_REQUESTED: 'Transcription demandée',
  TRANSCRIPTION_READY: 'Transcription terminée',
  INBOX_MESSAGE_ASSIGNED: 'Message rattaché',
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}
