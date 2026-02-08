import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Appointment,
  AppointmentFormData,
  fetchAppointments,
  fetchAppointmentsForDay,
  fetchAppointmentsForWeek,
  fetchUpcomingAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment,
  completeAppointment,
} from '@/lib/appointments';
import { NotificationEvents } from '@/lib/notificationSender';

interface UseAppointmentsResult {
  appointments: Appointment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (formData: AppointmentFormData) => Promise<Appointment | null>;
  update: (id: string, formData: Partial<AppointmentFormData>) => Promise<Appointment | null>;
  remove: (id: string) => Promise<boolean>;
  cancel: (id: string) => Promise<Appointment | null>;
  complete: (id: string) => Promise<Appointment | null>;
  moveAppointment: (id: string, newStart: Date, newEnd: Date) => Promise<Appointment | null>;
}

export type ViewMode = 'day' | 'week' | 'month';

interface UseAppointmentsOptions {
  viewMode?: ViewMode;
  selectedDate?: Date;
  practitionerId?: string;
  practitionerIds?: string[];
  appointmentTypes?: string[];
  statuses?: string[];
}

export function useAppointments(options: UseAppointmentsOptions = {}): UseAppointmentsResult {
  const { 
    viewMode = 'week', 
    selectedDate = new Date(), 
    practitionerId,
    practitionerIds = [],
    appointmentTypes = [],
    statuses = [],
  } = options;
  
  const { structureId, loading: structureLoading } = useStructureId();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!structureId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let data: Appointment[];

      if (viewMode === 'day') {
        data = await fetchAppointmentsForDay(structureId, selectedDate, practitionerId);
      } else if (viewMode === 'month') {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        data = await fetchAppointments(structureId, monthStart, monthEnd, practitionerId);
      } else {
        // Get start of week (Monday)
        const weekStart = new Date(selectedDate);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        data = await fetchAppointmentsForWeek(structureId, weekStart, practitionerId);
      }

      // Client-side filtering for multiple practitioners, types, and statuses
      let filtered = data;
      
      if (practitionerIds.length > 0) {
        filtered = filtered.filter((apt) => practitionerIds.includes(apt.practitioner_id));
      }
      
      if (appointmentTypes.length > 0) {
        filtered = filtered.filter((apt) => appointmentTypes.includes(apt.appointment_type));
      }
      
      if (statuses.length > 0) {
        filtered = filtered.filter((apt) => statuses.includes(apt.status));
      }

      setAppointments(filtered);
      setError(null);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [structureId, viewMode, selectedDate, practitionerId, practitionerIds, appointmentTypes, statuses]);

  useEffect(() => {
    if (!structureLoading) {
      refetch();
    }
  }, [structureLoading, refetch]);

  // Realtime subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, refetch]);

  const create = useCallback(
    async (formData: AppointmentFormData): Promise<Appointment | null> => {
      if (!structureId || !user) return null;

      try {
        const appointment = await createAppointment(structureId, user.id, formData);
        toast({
          title: 'Rendez-vous créé',
          description: 'Le rendez-vous a été ajouté à l\'agenda.',
        });
        await refetch();

        // Send notification for new appointment (fire and forget)
        if (appointment) {
          const patientName = appointment.patient
            ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
            : 'Patient';
          const practitionerName = appointment.practitioner?.profile
            ? `${appointment.practitioner.profile.first_name || ''} ${appointment.practitioner.profile.last_name || ''}`.trim()
            : 'Praticien';
          const dateTime = format(new Date(appointment.start_time), "EEEE d MMMM 'à' HH:mm", { locale: fr });

          NotificationEvents.newAppointment(
            structureId,
            patientName,
            practitionerName,
            dateTime,
            appointment.consultation_reason?.label
          ).catch((err) => console.error('Failed to send new appointment notification:', err));
        }

        return appointment;
      } catch (err) {
        console.error('Error creating appointment:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de créer le rendez-vous.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [structureId, user, refetch]
  );

  const update = useCallback(
    async (id: string, formData: Partial<AppointmentFormData>): Promise<Appointment | null> => {
      try {
        const appointment = await updateAppointment(id, formData);
        toast({
          title: 'Rendez-vous modifié',
          description: 'Les modifications ont été enregistrées.',
        });
        await refetch();
        return appointment;
      } catch (err) {
        console.error('Error updating appointment:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de modifier le rendez-vous.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [refetch]
  );

  const moveAppointment = useCallback(
    async (id: string, newStart: Date, newEnd: Date): Promise<Appointment | null> => {
      try {
        const appointment = await updateAppointment(id, {
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        });
        toast({
          title: 'Rendez-vous déplacé',
          description: 'Le rendez-vous a été déplacé avec succès.',
        });
        await refetch();
        return appointment;
      } catch (err) {
        console.error('Error moving appointment:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de déplacer le rendez-vous.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [refetch]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteAppointment(id);
        toast({
          title: 'Rendez-vous supprimé',
          description: 'Le rendez-vous a été supprimé.',
        });
        await refetch();
        return true;
      } catch (err) {
        console.error('Error deleting appointment:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer le rendez-vous.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [refetch]
  );

  const cancel = useCallback(
    async (id: string): Promise<Appointment | null> => {
      if (!structureId) return null;

      try {
        const appointment = await cancelAppointment(id);
        toast({
          title: 'Rendez-vous annulé',
          description: 'Le rendez-vous a été annulé.',
        });
        await refetch();

        // Send notification for cancelled appointment (fire and forget)
        if (appointment) {
          const patientName = appointment.patient
            ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
            : 'Patient';
          const practitionerName = appointment.practitioner?.profile
            ? `${appointment.practitioner.profile.first_name || ''} ${appointment.practitioner.profile.last_name || ''}`.trim()
            : 'Praticien';
          const dateTime = format(new Date(appointment.start_time), "EEEE d MMMM 'à' HH:mm", { locale: fr });

          NotificationEvents.cancelAppointment(
            structureId,
            patientName,
            practitionerName,
            dateTime
          ).catch((err) => console.error('Failed to send cancel notification:', err));
        }

        return appointment;
      } catch (err) {
        console.error('Error cancelling appointment:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'annuler le rendez-vous.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [structureId, refetch]
  );

  const complete = useCallback(
    async (id: string): Promise<Appointment | null> => {
      try {
        const appointment = await completeAppointment(id);
        toast({
          title: 'Rendez-vous terminé',
          description: 'Le rendez-vous a été marqué comme terminé.',
        });
        await refetch();
        return appointment;
      } catch (err) {
        console.error('Error completing appointment:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de terminer le rendez-vous.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [refetch]
  );

  return {
    appointments,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    cancel,
    complete,
    moveAppointment,
  };
}

// Hook for upcoming appointments (dashboard widget)
export function useUpcomingAppointments(limit: number = 5) {
  const { structureId, loading: structureLoading } = useStructureId();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!structureId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchUpcomingAppointments(structureId, limit);
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching upcoming appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [structureId, limit]);

  // Fix: Include structureId in dependencies and handle initial loading state properly
  useEffect(() => {
    // Only fetch when structure loading is complete
    if (!structureLoading) {
      // If no structureId after loading, set loading to false with empty appointments
      if (!structureId) {
        setAppointments([]);
        setLoading(false);
        return;
      }
      // Otherwise, fetch appointments
      refetch();
    }
  }, [structureLoading, structureId, refetch]);
  // Realtime subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('upcoming_appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, refetch]);

  return { appointments, loading, refetch };
}
