import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Types for data access
export type DataAccessAction = 'read' | 'decrypt' | 'export' | 'print';
export type EncryptionKeyPurpose = 'consultation_data' | 'patient_records' | 'ai_analysis' | 'recordings';
export type SensitivityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface DataAccessLog {
  id: string;
  user_id: string;
  structure_id: string;
  resource_type: string;
  resource_id: string;
  action_type: DataAccessAction;
  fields_accessed: string[];
  access_reason: string;
  access_reason_category: string;
  ip_address: string | null;
  user_agent: string | null;
  accessed_at: string;
  metadata: Json;
  // Joined data
  user_name?: string;
}

export interface EncryptedFieldInfo {
  id: string;
  table_name: string;
  column_name: string;
  encryption_key_purpose: EncryptionKeyPurpose;
  is_encrypted: boolean;
  sensitivity_level: SensitivityLevel;
  requires_justification: boolean;
}

export interface StructureIsolationAlert {
  id: string;
  attempted_by: string;
  source_structure_id: string;
  target_structure_id: string;
  resource_type: string;
  resource_id: string | null;
  alert_type: string;
  severity: string;
  details: Json;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface IsolationStatus {
  total_alerts: number;
  recent_alerts_24h: number;
  unresolved_alerts: number;
  status: 'healthy' | 'attention' | 'warning';
  last_checked: string;
}

// Predefined access reason categories
export const ACCESS_REASON_CATEGORIES = [
  { value: 'consultation', label: 'Consultation en cours', icon: 'Stethoscope' },
  { value: 'urgency', label: 'Urgence médicale', icon: 'AlertTriangle' },
  { value: 'audit', label: 'Audit / Contrôle qualité', icon: 'ClipboardCheck' },
  { value: 'legal_export', label: 'Export légal / Réquisition', icon: 'Scale' },
  { value: 'research', label: 'Recherche autorisée', icon: 'FlaskConical' },
  { value: 'patient_request', label: 'Demande du patient', icon: 'User' },
] as const;

export const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
};

export const SENSITIVITY_COLORS: Record<SensitivityLevel, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

// Log data access
export async function logDataAccess(
  resourceType: string,
  resourceId: string,
  actionType: DataAccessAction,
  fieldsAccessed: string[],
  accessReason: string,
  accessReasonCategory: string = 'consultation'
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_data_access', {
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_action_type: actionType,
      p_fields_accessed: fieldsAccessed,
      p_access_reason: accessReason,
      p_access_reason_category: accessReasonCategory,
    });

    if (error) {
      console.error('Error logging data access:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Failed to log data access:', err);
    return null;
  }
}

// Fetch data access logs
export async function fetchDataAccessLogs(
  options: {
    limit?: number;
    offset?: number;
    userId?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ logs: DataAccessLog[]; count: number }> {
  const { limit = 50, offset = 0, userId, resourceType, startDate, endDate } = options;

  let query = supabase
    .from('data_access_log')
    .select('*', { count: 'exact' })
    .order('accessed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  if (startDate) {
    query = query.gte('accessed_at', startDate);
  }

  if (endDate) {
    query = query.lte('accessed_at', endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching data access logs:', error);
    throw error;
  }

  return {
    logs: (data || []) as DataAccessLog[],
    count: count || 0,
  };
}

// Fetch encrypted fields registry
export async function fetchEncryptedFields(): Promise<EncryptedFieldInfo[]> {
  const { data, error } = await supabase
    .from('encrypted_fields_registry')
    .select('*')
    .order('sensitivity_level', { ascending: false })
    .order('table_name')
    .order('column_name');

  if (error) {
    console.error('Error fetching encrypted fields:', error);
    throw error;
  }

  return (data || []) as EncryptedFieldInfo[];
}

// Check if a field requires justification
export async function fieldRequiresJustification(
  tableName: string,
  columnName: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('encrypted_fields_registry')
    .select('requires_justification')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .single();

  if (error) {
    // Field not in registry = no justification required
    return false;
  }

  return data?.requires_justification ?? false;
}

// Fetch structure isolation status
export async function fetchIsolationStatus(structureId: string): Promise<IsolationStatus | null> {
  try {
    const { data, error } = await supabase.rpc('get_structure_isolation_status', {
      p_structure_id: structureId,
    });

    if (error) {
      console.error('Error fetching isolation status:', error);
      return null;
    }

    // Parse the JSONB response
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const result = data as Record<string, unknown>;
      return {
        total_alerts: (result.total_alerts as number) ?? 0,
        recent_alerts_24h: (result.recent_alerts_24h as number) ?? 0,
        unresolved_alerts: (result.unresolved_alerts as number) ?? 0,
        status: (result.status as 'healthy' | 'attention' | 'warning') ?? 'healthy',
        last_checked: (result.last_checked as string) ?? new Date().toISOString(),
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch isolation status:', err);
    return null;
  }
}

// Fetch isolation alerts
export async function fetchIsolationAlerts(
  options: {
    limit?: number;
    offset?: number;
    unresolvedOnly?: boolean;
  } = {}
): Promise<{ alerts: StructureIsolationAlert[]; count: number }> {
  const { limit = 50, offset = 0, unresolvedOnly = false } = options;

  let query = supabase
    .from('structure_isolation_alerts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unresolvedOnly) {
    query = query.eq('resolved', false);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching isolation alerts:', error);
    throw error;
  }

  return {
    alerts: (data || []) as StructureIsolationAlert[],
    count: count || 0,
  };
}

// Resolve an isolation alert
export async function resolveIsolationAlert(
  alertId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('structure_isolation_alerts')
    .update({
      resolved: true,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error resolving isolation alert:', error);
    throw error;
  }
}

// Get data access stats
export async function getDataAccessStats(structureId: string): Promise<{
  totalAccesses: number;
  accessesToday: number;
  accessesLast7Days: number;
  decryptions: number;
  exports: number;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, todayResult, weekResult, decryptResult, exportResult] = await Promise.all([
    supabase
      .from('data_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId),
    supabase
      .from('data_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('accessed_at', todayStart),
    supabase
      .from('data_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('accessed_at', sevenDaysAgo),
    supabase
      .from('data_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('action_type', 'decrypt'),
    supabase
      .from('data_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('action_type', 'export'),
  ]);

  return {
    totalAccesses: totalResult.count || 0,
    accessesToday: todayResult.count || 0,
    accessesLast7Days: weekResult.count || 0,
    decryptions: decryptResult.count || 0,
    exports: exportResult.count || 0,
  };
}
