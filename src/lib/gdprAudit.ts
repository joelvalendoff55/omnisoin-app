import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface GdprAuditLog {
  id: string;
  structure_id: string;
  actor_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  patient_uuid: string | null;
  details: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  actor_name?: string;
}

export type AuditActionType = 
  | 'vault_access' 
  | 'vault_create' 
  | 'vault_update' 
  | 'pseudonymization' 
  | 'data_export' 
  | 'deletion_request';

export type AuditTargetType = 
  | 'identity' 
  | 'medical_record' 
  | 'patient' 
  | 'transcript';

export const ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  vault_access: 'Accès coffre-fort',
  vault_create: 'Création identité',
  vault_update: 'Modification identité',
  pseudonymization: 'Pseudonymisation',
  data_export: 'Export de données',
  deletion_request: 'Demande de suppression',
};

export const TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  identity: 'Identité',
  medical_record: 'Dossier médical',
  patient: 'Patient',
  transcript: 'Transcription',
};

export const ACTION_TYPE_COLORS: Record<AuditActionType, string> = {
  vault_access: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  vault_create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  vault_update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pseudonymization: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  data_export: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  deletion_request: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export async function logGdprAudit(
  structureId: string,
  actorUserId: string,
  actionType: AuditActionType,
  targetType: AuditTargetType,
  options: {
    targetId?: string;
    patientUuid?: string;
    details?: Json;
  } = {}
): Promise<void> {
  const { error } = await supabase.from('gdpr_audit_logs').insert([{
    structure_id: structureId,
    actor_user_id: actorUserId,
    action_type: actionType,
    target_type: targetType,
    target_id: options.targetId || null,
    patient_uuid: options.patientUuid || null,
    details: options.details || {},
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  }]);

  if (error) {
    console.error('Failed to log GDPR audit:', error);
  }
}

export async function fetchGdprAuditLogs(
  structureId: string,
  options: {
    limit?: number;
    offset?: number;
    actionType?: AuditActionType;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ logs: GdprAuditLog[]; count: number }> {
  const { limit = 50, offset = 0, actionType, startDate, endDate } = options;

  let query = supabase
    .from('gdpr_audit_logs')
    .select('*', { count: 'exact' })
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (actionType) {
    query = query.eq('action_type', actionType);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    logs: (data || []) as GdprAuditLog[],
    count: count || 0,
  };
}

export async function getAuditStats(structureId: string): Promise<{
  totalLogs: number;
  vaultAccesses: number;
  pseudonymizations: number;
  exports: number;
  deletionRequests: number;
  last7Days: number;
}> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, vaultResult, pseudoResult, exportResult, deletionResult, recentResult] = 
    await Promise.all([
      supabase
        .from('gdpr_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId),
      supabase
        .from('gdpr_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('action_type', 'vault_access'),
      supabase
        .from('gdpr_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('action_type', 'pseudonymization'),
      supabase
        .from('gdpr_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('action_type', 'data_export'),
      supabase
        .from('gdpr_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('action_type', 'deletion_request'),
      supabase
        .from('gdpr_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .gte('created_at', sevenDaysAgo),
    ]);

  return {
    totalLogs: totalResult.count || 0,
    vaultAccesses: vaultResult.count || 0,
    pseudonymizations: pseudoResult.count || 0,
    exports: exportResult.count || 0,
    deletionRequests: deletionResult.count || 0,
    last7Days: recentResult.count || 0,
  };
}
