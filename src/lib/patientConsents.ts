import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type PatientConsentType = 'care' | 'data_processing' | 'recording' | 'ai_analysis' | 'data_sharing';
export type ConsentStatus = 'pending' | 'obtained' | 'refused' | 'revoked';

export interface ConsentTemplate {
  id: string;
  structure_id: string;
  consent_type: PatientConsentType;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  required_for_care: boolean;
  legal_references: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PatientConsent {
  id: string;
  structure_id: string;
  patient_id: string;
  template_id: string | null;
  consent_type: PatientConsentType;
  status: ConsentStatus;
  obtained_by: string | null;
  obtained_at: string | null;
  refused_at: string | null;
  refused_reason: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
  signed_document_url: string | null;
  signature_data: string | null;
  ip_address: string | null;
  user_agent: string | null;
  scroll_completed: boolean;
  checkbox_confirmed: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
  // Joined data
  template?: ConsentTemplate;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ConsentAudit {
  id: string;
  consent_id: string;
  structure_id: string;
  patient_id: string;
  action: string;
  previous_status: ConsentStatus | null;
  new_status: ConsentStatus | null;
  changed_by: string;
  changed_by_role: string;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json;
  changed_at: string;
}

export const CONSENT_TYPE_CONFIG: Record<PatientConsentType, { label: string; icon: string; color: string }> = {
  care: { label: 'Soins', icon: 'Heart', color: 'text-red-600 bg-red-100 border-red-200' },
  data_processing: { label: 'Traitement des données', icon: 'Database', color: 'text-blue-600 bg-blue-100 border-blue-200' },
  recording: { label: 'Enregistrement audio', icon: 'Mic', color: 'text-purple-600 bg-purple-100 border-purple-200' },
  ai_analysis: { label: 'Analyse IA', icon: 'Brain', color: 'text-emerald-600 bg-emerald-100 border-emerald-200' },
  data_sharing: { label: 'Partage de données', icon: 'Share2', color: 'text-orange-600 bg-orange-100 border-orange-200' },
};

export const CONSENT_STATUS_CONFIG: Record<ConsentStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'Clock' },
  obtained: { label: 'Obtenu', color: 'bg-green-100 text-green-800 border-green-200', icon: 'CheckCircle' },
  refused: { label: 'Refusé', color: 'bg-red-100 text-red-800 border-red-200', icon: 'XCircle' },
  revoked: { label: 'Révoqué', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: 'Ban' },
};

export async function fetchConsentTemplates(structureId: string): Promise<ConsentTemplate[]> {
  const { data, error } = await supabase
    .from('consent_templates')
    .select('*')
    .eq('structure_id', structureId)
    .eq('is_active', true)
    .order('consent_type');

  if (error) {
    console.error('Error fetching consent templates:', error);
    throw error;
  }

  return (data || []) as unknown as ConsentTemplate[];
}

export async function fetchPatientConsents(patientId: string): Promise<PatientConsent[]> {
  const { data, error } = await supabase
    .from('patient_consents')
    .select(`
      *,
      template:consent_templates(id, title, content, version, consent_type, legal_references)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient consents:', error);
    throw error;
  }

  return (data || []) as unknown as PatientConsent[];
}

export async function fetchConsentAudit(consentId: string): Promise<ConsentAudit[]> {
  const { data, error } = await supabase
    .from('consent_audit')
    .select('*')
    .eq('consent_id', consentId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching consent audit:', error);
    throw error;
  }

  return (data || []) as ConsentAudit[];
}

export interface CreateConsentParams {
  structure_id: string;
  patient_id: string;
  template_id: string;
  consent_type: PatientConsentType;
  obtained_by: string;
  signature_data?: string;
  scroll_completed: boolean;
  checkbox_confirmed: boolean;
}

export async function createConsent(params: CreateConsentParams): Promise<PatientConsent> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const insertData = {
    structure_id: params.structure_id,
    patient_id: params.patient_id,
    template_id: params.template_id,
    consent_type: params.consent_type,
    status: 'obtained' as ConsentStatus,
    obtained_by: params.obtained_by,
    obtained_at: new Date().toISOString(),
    signature_data: params.signature_data || null,
    scroll_completed: params.scroll_completed,
    checkbox_confirmed: params.checkbox_confirmed,
    user_agent: userAgent,
  };

  const { data, error } = await supabase
    .from('patient_consents')
    .insert(insertData)
    .select(`
      *,
      template:consent_templates(id, title, content, version, consent_type, legal_references)
    `)
    .single();

  if (error) {
    console.error('Error creating consent:', error);
    throw error;
  }

  return data as unknown as PatientConsent;
}

export async function refuseConsent(
  structureId: string,
  patientId: string,
  templateId: string,
  consentType: PatientConsentType,
  reason: string
): Promise<PatientConsent> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const { data, error } = await supabase
    .from('patient_consents')
    .insert({
      structure_id: structureId,
      patient_id: patientId,
      template_id: templateId,
      consent_type: consentType,
      status: 'refused' as ConsentStatus,
      refused_at: new Date().toISOString(),
      refused_reason: reason,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    console.error('Error refusing consent:', error);
    throw error;
  }

  return data as unknown as PatientConsent;
}

export async function revokeConsent(consentId: string, reason: string, revokedBy: string): Promise<PatientConsent> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const { data, error } = await supabase
    .from('patient_consents')
    .update({
      status: 'revoked' as ConsentStatus,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revoked_reason: reason,
      user_agent: userAgent,
    })
    .eq('id', consentId)
    .select()
    .single();

  if (error) {
    console.error('Error revoking consent:', error);
    throw error;
  }

  return data as unknown as PatientConsent;
}

export function getPatientConsentStatus(
  consents: PatientConsent[],
  consentType: PatientConsentType
): { status: ConsentStatus | 'not_requested'; consent: PatientConsent | null } {
  const latestConsent = consents
    .filter((c) => c.consent_type === consentType)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  if (!latestConsent) {
    return { status: 'not_requested', consent: null };
  }

  return { status: latestConsent.status, consent: latestConsent };
}
