// Types pour le système Hub Épisode

export type EncounterMode = 'solo' | 'assisted';

export type EncounterStatus = 
  | 'created'
  | 'preconsult_in_progress'
  | 'preconsult_ready'
  | 'consultation_in_progress'
  | 'completed'
  | 'cancelled';

export interface Encounter {
  id: string;
  patient_id: string;
  structure_id: string;
  mode: EncounterMode;
  status: EncounterStatus;
  queue_entry_id: string | null;
  preconsultation_id: string | null;
  consultation_id: string | null;
  appointment_id: string | null;
  assigned_practitioner_id: string | null;
  assigned_assistant_id: string | null;
  started_at: string;
  preconsult_completed_at: string | null;
  consultation_started_at: string | null;
  completed_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface EncounterWithRelations extends Encounter {
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    dob: string | null;
    sex: string | null;
  };
  assigned_practitioner?: {
    id: string;
    job_title: string;
    user_id: string;
  };
  assigned_assistant?: {
    id: string;
    job_title: string;
    user_id: string;
  };
  queue_entry?: {
    id: string;
    status: string;
    priority: number;
    arrival_time: string;
    reason: string | null;
  };
}

export interface EncounterStatusHistoryEntry {
  id: string;
  encounter_id: string;
  previous_status: EncounterStatus | null;
  new_status: EncounterStatus;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  metadata: Record<string, unknown>;
}

// Labels et couleurs pour l'affichage
export const ENCOUNTER_STATUS_CONFIG: Record<EncounterStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  created: {
    label: 'Créé',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: 'Circle',
  },
  preconsult_in_progress: {
    label: 'Pré-consultation en cours',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'UserCheck',
  },
  preconsult_ready: {
    label: 'Prêt pour consultation',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle',
  },
  consultation_in_progress: {
    label: 'Consultation en cours',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    icon: 'Stethoscope',
  },
  completed: {
    label: 'Terminé',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    icon: 'CheckCircle2',
  },
  cancelled: {
    label: 'Annulé',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    icon: 'XCircle',
  },
};

export const ENCOUNTER_MODE_CONFIG: Record<EncounterMode, {
  label: string;
  description: string;
  icon: string;
}> = {
  solo: {
    label: 'Mode Solo',
    description: 'Médecin seul - consultation directe',
    icon: 'User',
  },
  assisted: {
    label: 'Mode Assisté',
    description: 'Avec pré-consultation par l\'assistante',
    icon: 'Users',
  },
};
