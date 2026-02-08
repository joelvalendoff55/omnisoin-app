import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { startOfDay, endOfDay } from 'date-fns';
import type { QueueEntry } from '@/lib/queue';
import type { Task } from '@/lib/tasks';
import type { Notification } from '@/lib/notifications';

export interface AssistantStats {
  patientsReceived: number;
  callsMade: number;
  appointmentsTaken: number;
  queueWaiting: number;
  consultationsToday: number;
  upcomingAppointments: number;
  documentsToProcess: number;
  pendingTasks: number;
}

export interface CallbackItem {
  id: string;
  patient_id: string | null;
  sender_phone: string | null;
  text_body: string | null;
  created_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface UseAssistantDashboardResult {
  queueToday: QueueEntry[];
  tasksAssigned: Task[];
  callbackItems: CallbackItem[];
  stats: AssistantStats;
  urgentNotifications: Notification[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  teamMemberId: string | null;
}

export function useAssistantDashboard(): UseAssistantDashboardResult {
  const { user } = useAuth();
  const { structureId, loading: structureLoading } = useStructureId();
  const [queueToday, setQueueToday] = useState<QueueEntry[]>([]);
  const [tasksAssigned, setTasksAssigned] = useState<Task[]>([]);
  const [callbackItems, setCallbackItems] = useState<CallbackItem[]>([]);
  const [stats, setStats] = useState<AssistantStats>({
    patientsReceived: 0,
    callsMade: 0,
    appointmentsTaken: 0,
    queueWaiting: 0,
    consultationsToday: 0,
    upcomingAppointments: 0,
    documentsToProcess: 0,
    pendingTasks: 0,
  });
  const [urgentNotifications, setUrgentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !structureId || structureLoading) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      // Get team member ID for current user
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('structure_id', structureId)
        .maybeSingle();

      const currentTeamMemberId = teamMember?.id || null;
      setTeamMemberId(currentTeamMemberId);

      // Fetch all data in parallel
      const [
        queueRes,
        tasksRes,
        callbackRes,
        completedQueueRes,
        appointmentsRes,
        notificationsRes,
        consultationsRes,
        upcomingApptsRes,
        documentsRes,
      ] = await Promise.all([
        // Today's queue (waiting + in_progress)
        supabase
          .from('patient_queue')
          .select(`
            *,
            patient:patients(id, first_name, last_name, phone),
            assigned_team_member:team_members(id, job_title, user_id),
            consultation_reason:consultation_reasons(id, code, label, category, color)
          `)
          .eq('structure_id', structureId)
          .in('status', ['waiting', 'in_consultation', 'called'])
          .gte('arrival_time', dayStart)
          .order('priority', { ascending: true })
          .order('arrival_time', { ascending: true }),

        // Tasks assigned to this user (pending/in_progress)
        currentTeamMemberId
          ? supabase
              .from('tasks')
              .select(`
                *,
                patient:patients(id, first_name, last_name),
                assigned_team_member:team_members(id, job_title, user_id)
              `)
              .eq('assigned_to', currentTeamMemberId)
              .in('status', ['pending', 'in_progress'])
              .order('priority', { ascending: true })
              .order('due_date', { ascending: true, nullsFirst: false })
          : Promise.resolve({ data: [], error: null }),

        // Callbacks: inbox messages with "rappeler" or patient's note contains callback
        supabase
          .from('inbox_messages')
          .select(`
            id,
            patient_id,
            sender_phone,
            text_body,
            created_at,
            patient:patients(id, first_name, last_name)
          `)
          .eq('structure_id', structureId)
          .eq('status', 'received')
          .or('text_body.ilike.%rappeler%,text_body.ilike.%rappel%,text_body.ilike.%callback%')
          .order('created_at', { ascending: false })
          .limit(20),

        // Completed queue entries today (for stats)
        supabase
          .from('patient_queue')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', structureId)
          .eq('status', 'completed')
          .gte('completed_at', dayStart)
          .lte('completed_at', dayEnd),

        // Appointments created today (for stats)
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', structureId)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd),

        // Urgent notifications for this user
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('read', false)
          .in('type', ['error', 'warning', 'queue', 'task'])
          .order('created_at', { ascending: false })
          .limit(5),

        // Consultations today
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', structureId)
          .gte('consultation_date', dayStart)
          .lte('consultation_date', dayEnd),

        // Upcoming appointments today
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', structureId)
          .gte('start_time', new Date().toISOString())
          .lte('start_time', dayEnd)
          .eq('status', 'scheduled'),

        // Documents to process (status pending)
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('structure_id', structureId)
          .eq('status', 'pending'),
      ]);

      // Process results
      if (queueRes.error) throw queueRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (callbackRes.error) throw callbackRes.error;

      setQueueToday((queueRes.data || []) as unknown as QueueEntry[]);
      setTasksAssigned((tasksRes.data || []) as unknown as Task[]);
      setCallbackItems((callbackRes.data || []) as unknown as CallbackItem[]);
      setUrgentNotifications((notificationsRes.data || []) as unknown as Notification[]);

      // Calculate stats
      const queueWaiting = (queueRes.data || []).filter(
        (e: { status: string }) => e.status === 'waiting'
      ).length;

      setStats({
        patientsReceived: completedQueueRes.count || 0,
        callsMade: callbackRes.data?.length || 0,
        appointmentsTaken: appointmentsRes.count || 0,
        queueWaiting,
        consultationsToday: consultationsRes.count || 0,
        upcomingAppointments: upcomingApptsRes.count || 0,
        documentsToProcess: documentsRes.count || 0,
        pendingTasks: (tasksRes.data || []).length,
      });
    } catch (err) {
      console.error('Error fetching assistant dashboard:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [user, structureId, structureLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions for queue and tasks
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('assistant-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, fetchData]);

  return {
    queueToday,
    tasksAssigned,
    callbackItems,
    stats,
    urgentNotifications,
    loading,
    error,
    refresh: fetchData,
    teamMemberId,
  };
}
