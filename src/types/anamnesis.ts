// Shared type for anamnesis records
export interface AnamnesisRecord {
  id: string;
  transcript_id: string;
  patient_id: string;
  consultation_id: string | null;
  assistant_summary: Record<string, unknown> | null;
  doctor_summary: Record<string, unknown> | null;
  structured_data: Record<string, unknown> | null;
  confidence_score: number | null;
  status: string;
  processing_time_ms?: number | null;
  model_used?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface AssistantSummary {
  motif?: string;
  symptomes_principaux?: string[];
  antecedents_pertinents?: string[];
  infos_admin?: {
    traitements_en_cours?: string[];
    allergies?: string[];
    autres?: string;
  };
  niveau_urgence?: 'faible' | 'modéré' | 'élevé' | 'critique';
  justification_urgence?: string;
  confidence_score?: number;
}

export interface DoctorSummary {
  histoire_maladie?: string;
  antecedents?: {
    medicaux?: string[];
    chirurgicaux?: string[];
    familiaux?: string[];
    allergies?: string[];
  };
  symptomes_details?: Array<{
    symptome: string;
    debut?: string;
    evolution?: string;
    intensite?: string;
  }>;
  facteurs?: {
    aggravants?: string[];
    soulageants?: string[];
  };
  hypotheses_diagnostiques?: Array<{
    diagnostic: string;
    probabilite?: 'haute' | 'moyenne' | 'faible';
    arguments?: string[];
  }>;
  examens_suggeres?: Array<{
    examen: string;
    justification?: string;
    urgence?: string;
  }>;
  confidence_score?: number;
}