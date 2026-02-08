import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type JourneyStepType = 
  | 'present'           // Patient enregistré, arrivée confirmée
  | 'waiting'           // En attente dans la salle d'attente
  | 'called'            // Appelé par l'équipe
  | 'in_consultation'   // En consultation avec médecin/assistante
  | 'awaiting_exam'     // En attente d'examen complémentaire
  | 'completed'         // Consultation terminée (pré-clôture)
  | 'closed'            // Clôture administrative validée
  | 'no_show'           // Absence non justifiée
  | 'cancelled';        // Annulation justifiée

export interface PatientJourneyStep {
  id: string;
  queue_entry_id: string;
  step_type: JourneyStepType;
  step_at: string;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface PatientJourneyStepInsert {
  queue_entry_id: string;
  step_type: JourneyStepType;
  step_at?: string;
  performed_by?: string | null;
  notes?: string | null;
}

// Map step type to queue status
export const STEP_TO_STATUS: Record<JourneyStepType, string> = {
  present: 'present',
  waiting: 'waiting',
  called: 'called',
  in_consultation: 'in_consultation',
  awaiting_exam: 'awaiting_exam',
  completed: 'completed',
  closed: 'closed',
  cancelled: 'cancelled',
  no_show: 'no_show',
};

// Valid transitions between statuses (juridiquement contrôlées)
export const VALID_TRANSITIONS: Record<string, string[]> = {
  present: ['waiting', 'called', 'in_consultation', 'no_show', 'cancelled'],
  waiting: ['called', 'in_consultation', 'no_show', 'cancelled'],
  called: ['in_consultation', 'waiting', 'no_show'],
  in_consultation: ['awaiting_exam', 'completed', 'cancelled'],
  awaiting_exam: ['in_consultation', 'completed'],
  completed: ['closed'], // Requires billing validation
  closed: [], // Terminal - aucune transition autorisée
  cancelled: [], // Terminal
  no_show: [], // Terminal
};

export const STATUS_LABELS: Record<string, string> = {
  present: 'Présent',
  waiting: 'En attente',
  called: 'Appelé',
  in_consultation: 'En consultation',
  awaiting_exam: 'Attente examen',
  completed: 'Terminé',
  closed: 'Clôturé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};

export const STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  called: 'bg-blue-100 text-blue-800 border-blue-200',
  in_consultation: 'bg-purple-100 text-purple-800 border-purple-200',
  awaiting_exam: 'bg-orange-100 text-orange-800 border-orange-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-slate-100 text-slate-800 border-slate-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  no_show: 'bg-red-100 text-red-800 border-red-200',
};

export function canTransition(currentStatus: string, targetStatus: string): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export async function addJourneyStep(step: PatientJourneyStepInsert): Promise<PatientJourneyStep> {
  const { data, error } = await supabase
    .from('patient_journey_steps')
    .insert(step)
    .select()
    .single();

  if (error) {
    console.error('Error adding journey step:', error);
    throw error;
  }

  return data as unknown as PatientJourneyStep;
}

export async function getJourneySteps(queueEntryId: string): Promise<PatientJourneyStep[]> {
  const { data, error } = await supabase
    .from('patient_journey_steps')
    .select('*')
    .eq('queue_entry_id', queueEntryId)
    .order('step_at', { ascending: true });

  if (error) {
    console.error('Error fetching journey steps:', error);
    throw error;
  }

  return (data || []) as unknown as PatientJourneyStep[];
}

export async function updateQueueStatus(
  queueEntryId: string,
  status: string,
  additionalUpdates: Record<string, unknown> = {}
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    ...additionalUpdates,
  };

  // Set timestamps based on status
  const now = new Date().toISOString();
  switch (status) {
    case 'called':
      updates.called_at = now;
      break;
    case 'in_consultation':
      updates.started_at = now;
      break;
    case 'completed':
    case 'closed':
    case 'cancelled':
    case 'no_show':
      updates.completed_at = now;
      break;
  }

  const { error } = await supabase
    .from('patient_queue')
    .update(updates)
    .eq('id', queueEntryId);

  if (error) {
    console.error('Error updating queue status:', error);
    throw error;
  }
}

export async function logJourneyActivity(
  structureId: string,
  userId: string,
  patientId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase
    .from('activity_logs')
    .insert([{
      structure_id: structureId,
      actor_user_id: userId,
      patient_id: patientId,
      action,
      metadata: metadata as unknown as import('@/integrations/supabase/types').Json,
    }]);

  if (error) {
    console.error('Error logging journey activity:', error);
    // Don't throw - logging shouldn't break the flow
  }
}
