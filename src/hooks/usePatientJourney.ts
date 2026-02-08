import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from './useAuth';
import { useStructureId } from './useStructureId';
import {
  PatientJourneyStep,
  JourneyStepType,
  addJourneyStep,
  getJourneySteps,
  updateQueueStatus,
  logJourneyActivity,
  canTransition,
  STEP_TO_STATUS,
} from '@/lib/patientJourney';
import type { QueueEntry } from '@/lib/queue';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { createNotification } from '@/lib/notifications';
import { NotificationEvents } from '@/lib/notificationSender';

interface UsePatientJourneyResult {
  loading: boolean;
  steps: PatientJourneyStep[];
  loadSteps: (queueEntryId: string) => Promise<void>;
  checkIn: (entry: QueueEntry) => Promise<void>;
  callPatient: (entry: QueueEntry, assignedTo?: string) => Promise<void>;
  startConsultation: (entry: QueueEntry) => Promise<void>;
  sendToExam: (entry: QueueEntry, notes?: string) => Promise<void>;
  returnFromExam: (entry: QueueEntry) => Promise<void>;
  completeConsultation: (entry: QueueEntry, notes?: string) => Promise<void>;
  markNoShow: (entry: QueueEntry) => Promise<void>;
  cancelVisit: (entry: QueueEntry, reason?: string) => Promise<void>;
  requeue: (entry: QueueEntry) => Promise<void>;
}

export function usePatientJourney(): UsePatientJourneyResult {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<PatientJourneyStep[]>([]);
  const { user } = useAuth();
  const { structureId } = useStructureId();

  const loadSteps = useCallback(async (queueEntryId: string) => {
    try {
      const data = await getJourneySteps(queueEntryId);
      setSteps(data);
    } catch (error) {
      console.error('Failed to load journey steps:', error);
    }
  }, []);

  const performTransition = useCallback(
    async (
      entry: QueueEntry,
      stepType: JourneyStepType,
      additionalUpdates: Record<string, unknown> = {},
      notes?: string
    ) => {
      const targetStatus = STEP_TO_STATUS[stepType];
      const currentStatus = entry.status || 'waiting';

      if (!canTransition(currentStatus, targetStatus)) {
        toast.error(`Transition invalide: ${currentStatus} → ${targetStatus}`);
        return;
      }

      setLoading(true);
      try {
        // Add journey step
        await addJourneyStep({
          queue_entry_id: entry.id,
          step_type: stepType,
          performed_by: user?.id || null,
          notes: notes || null,
        });

        // Update queue entry status
        await updateQueueStatus(entry.id, targetStatus, additionalUpdates);

        // Log activity
        if (structureId && user?.id) {
          await logJourneyActivity(
            structureId,
            user.id,
            entry.patient_id,
            `queue_${stepType}`,
            {
              queue_entry_id: entry.id,
              previous_status: currentStatus,
              new_status: targetStatus,
            }
          );
        }

        toast.success(`Patient ${getStepActionLabel(stepType)}`);
      } catch (error) {
        console.error('Failed to perform transition:', error);
        toast.error('Erreur lors de la mise à jour du statut');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user, structureId]
  );

  const checkIn = useCallback(
    async (entry: QueueEntry) => {
      await performTransition(entry, 'present', {
        checked_in_at: new Date().toISOString(),
      });
    },
    [performTransition]
  );

  const callPatient = useCallback(
    async (entry: QueueEntry, assignedTo?: string) => {
      const assignedUserId = assignedTo || entry.assigned_to;
      
      await performTransition(entry, 'called', {
        assigned_to: assignedUserId,
      });

      // Notify the assigned team member if different from current user
      if (assignedUserId && structureId) {
        try {
          // Get user_id from team_member
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('id', assignedUserId)
            .single();

          if (teamMember && teamMember.user_id !== user?.id) {
            // Get patient name
            const { data: patient } = await supabase
              .from('patients')
              .select('first_name, last_name')
              .eq('id', entry.patient_id)
              .single();

            const patientName = patient
              ? `${patient.first_name} ${patient.last_name}`
              : 'Patient';

            await createNotification(
              teamMember.user_id,
              structureId,
              'Patient appelé',
              `${patientName} vous attend`,
              'queue',
              '/queue'
            );
          }
        } catch (notifError) {
          console.error('Error creating call notification:', notifError);
        }
      }
    },
    [performTransition, structureId, user]
  );

  const startConsultation = useCallback(
    async (entry: QueueEntry) => {
      await performTransition(entry, 'in_consultation');

      // Notify if assigned to someone else
      if (entry.assigned_to && structureId) {
        try {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('id', entry.assigned_to)
            .single();

          if (teamMember && teamMember.user_id !== user?.id) {
            const { data: patient } = await supabase
              .from('patients')
              .select('first_name, last_name')
              .eq('id', entry.patient_id)
              .single();

            const patientName = patient
              ? `${patient.first_name} ${patient.last_name}`
              : 'Patient';

            await createNotification(
              teamMember.user_id,
              structureId,
              'Consultation démarrée',
              `${patientName} est en consultation`,
              'queue',
              '/queue'
            );
          }
        } catch (notifError) {
          console.error('Error creating start notification:', notifError);
        }
      }
    },
    [performTransition, structureId, user]
  );

  const sendToExam = useCallback(
    async (entry: QueueEntry, notes?: string) => {
      await performTransition(entry, 'awaiting_exam', {}, notes || 'En attente d\'examen complémentaire');
    },
    [performTransition]
  );

  const returnFromExam = useCallback(
    async (entry: QueueEntry) => {
      await performTransition(entry, 'in_consultation', {});
    },
    [performTransition]
  );

  const completeConsultation = useCallback(
    async (entry: QueueEntry, notes?: string) => {
      await performTransition(entry, 'completed', {}, notes);
    },
    [performTransition]
  );

  const markNoShow = useCallback(
    async (entry: QueueEntry) => {
      await performTransition(entry, 'no_show');

      // Send no-show notification (fire and forget)
      if (structureId) {
        try {
          // Get patient info
          const { data: patient } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', entry.patient_id)
            .maybeSingle();

          let practitionerName = 'Équipe médicale';
          if (entry.assigned_to) {
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('job_title, user_id')
              .eq('id', entry.assigned_to)
              .maybeSingle();

            if (teamMember?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('user_id', teamMember.user_id)
                .maybeSingle();

              if (profile) {
                practitionerName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || teamMember.job_title || 'Praticien';
              }
            }
          }

          const patientName = patient
            ? `${patient.first_name} ${patient.last_name}`
            : 'Patient';
          const dateTime = format(new Date(), "EEEE d MMMM 'à' HH:mm", { locale: fr });

          NotificationEvents.noShow(structureId, patientName, practitionerName, dateTime).catch((err) =>
            console.error('Failed to send no-show notification:', err)
          );
        } catch (err) {
          console.error('Error sending no-show notification:', err);
        }
      }
    },
    [performTransition, structureId]
  );

  const cancelVisit = useCallback(
    async (entry: QueueEntry, reason?: string) => {
      await performTransition(entry, 'cancelled', {}, reason);
    },
    [performTransition]
  );
  const requeue = useCallback(
    async (entry: QueueEntry) => {
      // Special case: re-add a no-show patient
      if (entry.status !== 'no_show') {
        toast.error('Seuls les patients absents peuvent être remis en file');
        return;
      }

      setLoading(true);
      try {
        await addJourneyStep({
          queue_entry_id: entry.id,
          step_type: 'waiting',
          performed_by: user?.id || null,
          notes: 'Remis en file après absence',
        });

        await updateQueueStatus(entry.id, 'waiting', {
          arrival_time: new Date().toISOString(),
          called_at: null,
          started_at: null,
          completed_at: null,
        });

        if (structureId && user?.id) {
          await logJourneyActivity(
            structureId,
            user.id,
            entry.patient_id,
            'queue_requeued',
            { queue_entry_id: entry.id }
          );
        }

        toast.success('Patient remis en file d\'attente');
      } catch (error) {
        console.error('Failed to requeue patient:', error);
        toast.error('Erreur lors de la remise en file');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user, structureId]
  );

  return {
    loading,
    steps,
    loadSteps,
    checkIn,
    callPatient,
    startConsultation,
    sendToExam,
    returnFromExam,
    completeConsultation,
    markNoShow,
    cancelVisit,
    requeue,
  };
}

function getStepActionLabel(stepType: JourneyStepType): string {
  switch (stepType) {
    case 'present':
      return 'enregistré';
    case 'waiting':
      return 'en attente';
    case 'called':
      return 'appelé';
    case 'in_consultation':
      return 'pris en charge';
    case 'awaiting_exam':
      return 'envoyé pour examen';
    case 'completed':
      return 'consultation terminée';
    case 'closed':
      return 'dossier clôturé';
    case 'cancelled':
      return 'visite annulée';
    case 'no_show':
      return 'marqué absent';
    default:
      return 'mis à jour';
  }
}
