"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

interface RealtimeNotificationsOptions {
  enabled?: boolean;
  throttleMs?: number;
  enableBrowserNotifications?: boolean;
}

type NotificationType = 'queue' | 'alert' | 'appointment' | 'task' | 'activity';

interface NotificationConfig {
  sound?: boolean;
  browserNotification?: boolean;
}

const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  queue: { sound: true, browserNotification: true },
  alert: { sound: true, browserNotification: true },
  appointment: { browserNotification: true },
  task: { browserNotification: false },
  activity: { browserNotification: false },
};

export function useRealtimeNotifications(options: RealtimeNotificationsOptions = {}) {
  const { enabled = true, throttleMs = 2000, enableBrowserNotifications = true } = options;
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const lastToastTime = useRef<Map<string, number>>(new Map());
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Request browser notification permission
  useEffect(() => {
    if (enableBrowserNotifications && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setBrowserPermission(permission);
        });
      }
    }
  }, [enableBrowserNotifications]);

  const showBrowserNotification = useCallback(
    (title: string, body: string, icon?: string) => {
      if (
        enableBrowserNotifications &&
        'Notification' in window &&
        browserPermission === 'granted' &&
        document.hidden
      ) {
        const notification = new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: `notification-${Date.now()}`,
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    },
    [enableBrowserNotifications, browserPermission]
  );

  const showThrottledToast = useCallback(
    (
      key: string,
      message: string,
      type: NotificationType = 'activity',
      variant: 'info' | 'warning' | 'error' | 'success' = 'info',
      description?: string
    ) => {
      const now = Date.now();
      const lastTime = lastToastTime.current.get(key) || 0;

      if (now - lastTime >= throttleMs) {
        lastToastTime.current.set(key, now);

        const config = NOTIFICATION_CONFIG[type];
        const toastFn = variant === 'error' ? toast.error : 
                        variant === 'warning' ? toast.warning : 
                        variant === 'success' ? toast.success : toast.info;

        toastFn(message, {
          description,
          duration: 4000,
          position: 'bottom-right',
        });

        // Show browser notification for important events
        if (config.browserNotification) {
          showBrowserNotification(message, description || '');
        }
      }
    },
    [throttleMs, showBrowserNotification]
  );

  useEffect(() => {
    if (!enabled || !user || !structureId) {
      return;
    }

    // Subscribe to patient_queue changes (new patients, status changes)
    const queueChannel = supabase
      .channel('realtime-patient-queue')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        async (payload) => {
          if (payload.new) {
            // Fetch patient name
            const { data: patient } = await supabase
              .from('patients')
              .select('first_name, last_name')
              .eq('id', payload.new.patient_id)
              .maybeSingle();

            const patientName = patient
              ? `${patient.first_name} ${patient.last_name}`
              : 'Nouveau patient';

            showThrottledToast(
              `queue-new-${payload.new.id}`,
              '🏥 Nouveau patient en attente',
              'queue',
              'info',
              patientName
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        async (payload) => {
          if (payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;

            // Only notify on specific status changes
            if (oldStatus !== newStatus) {
              // Fetch patient name
              const { data: patient } = await supabase
                .from('patients')
                .select('first_name, last_name')
                .eq('id', payload.new.patient_id)
                .maybeSingle();

              const patientName = patient
                ? `${patient.first_name} ${patient.last_name}`
                : 'Patient';

              if (newStatus === 'called') {
                showThrottledToast(
                  `queue-called-${payload.new.id}`,
                  '📢 Patient appelé',
                  'queue',
                  'info',
                  patientName
                );
              } else if (newStatus === 'in_consultation') {
                showThrottledToast(
                  `queue-consultation-${payload.new.id}`,
                  '👨‍⚕️ Consultation démarrée',
                  'queue',
                  'success',
                  patientName
                );
              } else if (newStatus === 'no_show') {
                showThrottledToast(
                  `queue-noshow-${payload.new.id}`,
                  '⚠️ Patient absent',
                  'queue',
                  'warning',
                  patientName
                );
              }
            }

            // Alert for long wait times (>30 min)
            if (payload.new.arrival_time) {
              const waitMinutes = Math.floor(
                (Date.now() - new Date(payload.new.arrival_time).getTime()) / 60000
              );
              if (waitMinutes > 30 && payload.new.status === 'waiting') {
                const { data: patient } = await supabase
                  .from('patients')
                  .select('first_name, last_name')
                  .eq('id', payload.new.patient_id)
                  .maybeSingle();

                showThrottledToast(
                  `queue-longwait-${payload.new.id}`,
                  '⏰ Attente prolongée',
                  'alert',
                  'warning',
                  `${patient?.first_name} ${patient?.last_name} attend depuis ${waitMinutes} min`
                );
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to appointments (cancellations, urgent bookings)
    const appointmentsChannel = supabase
      .channel('realtime-appointments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `structure_id=eq.${structureId}`,
        },
        async (payload) => {
          if (payload.new && payload.old && payload.new.status !== payload.old.status) {
            if (payload.new.status === 'cancelled') {
              const { data: patient } = await supabase
                .from('patients')
                .select('first_name, last_name')
                .eq('id', payload.new.patient_id)
                .maybeSingle();

              showThrottledToast(
                `apt-cancelled-${payload.new.id}`,
                '❌ RDV annulé',
                'appointment',
                'warning',
                patient ? `${patient.first_name} ${patient.last_name}` : 'Rendez-vous annulé'
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `structure_id=eq.${structureId}`,
        },
        async (payload) => {
          if (payload.new) {
            // Check if appointment is today or urgent
            const aptDate = new Date(payload.new.start_time);
            const today = new Date();
            const isToday = aptDate.toDateString() === today.toDateString();

            if (isToday) {
              const { data: patient } = await supabase
                .from('patients')
                .select('first_name, last_name')
                .eq('id', payload.new.patient_id)
                .maybeSingle();

              showThrottledToast(
                `apt-new-${payload.new.id}`,
                '📅 Nouveau RDV aujourd\'hui',
                'appointment',
                'info',
                patient ? `${patient.first_name} ${patient.last_name}` : undefined
              );
            }
          }
        }
      )
      .subscribe();

    // Subscribe to critical tasks
    const tasksChannel = supabase
      .channel('realtime-tasks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          if (payload.new && payload.new.priority <= 2) {
            showThrottledToast(
              `task-urgent-${payload.new.id}`,
              '🚨 Nouvelle tâche urgente',
              'alert',
              'error',
              payload.new.title as string
            );
          }
        }
      )
      .subscribe();

    // Subscribe to activity_logs inserts
    const activityChannel = supabase
      .channel('realtime-activity-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          // Don't show toast for own actions
          if (payload.new && payload.new.actor_user_id !== user.id) {
            const action = payload.new.action as string;
            const actionLabels: Record<string, string> = {
              PATIENT_CREATED: 'Nouveau patient créé',
              PATIENT_UPDATED: 'Patient mis à jour',
              PATIENT_ARCHIVED: 'Patient archivé',
              PATIENT_RESTORED: 'Patient restauré',
              DELEGATION_CREATED: 'Nouvelle délégation',
              DELEGATION_UPDATED: 'Délégation mise à jour',
              DELEGATION_DELETED: 'Délégation supprimée',
            };
            const label = actionLabels[action];
            if (label) {
              showThrottledToast(`activity-${payload.new.id}`, label, 'activity', 'info');
            }
          }
        }
      )
      .subscribe();

    // Subscribe to practitioner_assistants changes
    const delegationsChannel = supabase
      .channel('realtime-delegations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioner_assistants',
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            showThrottledToast('delegation-new', 'Nouvelle délégation créée', 'activity', 'info');
          } else if (payload.eventType === 'UPDATE') {
            showThrottledToast('delegation-update', 'Délégation modifiée', 'activity', 'info');
          } else if (payload.eventType === 'DELETE') {
            showThrottledToast('delegation-delete', 'Délégation supprimée', 'activity', 'info');
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(delegationsChannel);
    };
  }, [enabled, user, structureId, showThrottledToast]);

  return {
    browserPermission,
    requestPermission: async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        return permission;
      }
      return browserPermission;
    },
  };
}
