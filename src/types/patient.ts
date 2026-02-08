import { z } from 'zod';

// Patient origin enum values
export const PATIENT_ORIGIN_VALUES = ['spontanee', 'samu', 'hopital', 'confrere', 'autre'] as const;
export type PatientOriginType = typeof PATIENT_ORIGIN_VALUES[number];

// Patient status enum values  
export const PATIENT_STATUS_VALUES = ['actif', 'clos'] as const;
export type PatientStatusType = typeof PATIENT_STATUS_VALUES[number];

// Schéma de validation pour les patients
export const patientSchema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est requis').max(100),
  last_name: z.string().trim().min(1, 'Le nom est requis').max(100),
  dob: z.string().optional().nullable(),
  sex: z.enum(['M', 'F', 'O']).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.union([
    z.literal(''),
    z.literal(null),
    z.string().trim().email('Email invalide').max(255),
  ]).optional().nullable(),
  primary_practitioner_user_id: z.string().uuid().optional().nullable(),
  note_admin: z.string().trim().max(2000).optional().nullable(),
  origin: z.enum(PATIENT_ORIGIN_VALUES).optional().nullable(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

export interface Patient {
  id: string;
  structure_id: string | null;
  first_name: string;
  last_name: string;
  dob: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  primary_practitioner_user_id: string | null;
  note_admin: string | null;
  is_archived: boolean | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Patient origin fields
  origin: PatientOriginType | null;
  origin_type: string | null;
  origin_referrer_name: string | null;
  origin_notes: string | null;
  // Patient status fields
  status: PatientStatusType | null;
  closed_at: string | null;
  closed_by: string | null;
}
