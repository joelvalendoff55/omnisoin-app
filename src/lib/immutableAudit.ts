import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Types for immutable audit
export type AuditEventType = 
  | 'user_action'
  | 'data_access'
  | 'data_modification'
  | 'export'
  | 'security_event'
  | 'system_event';

export interface ImmutableAuditLog {
  id: string;
  log_timestamp: string;
  event_type: AuditEventType;
  user_id: string | null;
  structure_id: string;
  resource_type: string | null;
  resource_id: string | null;
  action: string;
  previous_value: Json;
  new_value: Json;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  hash_chain: string;
  // Joined data
  user_name?: string;
}

export interface HashChainVerification {
  is_valid: boolean;
  total_logs: number;
  first_broken_at: string | null;
  broken_log_id: string | null;
  expected_hash: string | null;
  actual_hash: string | null;
}

export const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  user_action: 'Action utilisateur',
  data_access: 'Accès données',
  data_modification: 'Modification données',
  export: 'Export',
  security_event: 'Événement sécurité',
  system_event: 'Événement système',
};

export const EVENT_TYPE_COLORS: Record<AuditEventType, string> = {
  user_action: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  data_access: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  data_modification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  export: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  security_event: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  system_event: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

// Log immutable event via RPC
export async function logImmutableEvent(
  eventType: AuditEventType,
  action: string,
  options: {
    resourceType?: string;
    resourceId?: string;
    previousValue?: Json;
    newValue?: Json;
  } = {}
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_immutable_event', {
      p_event_type: eventType,
      p_action: action,
      p_resource_type: options.resourceType || null,
      p_resource_id: options.resourceId || null,
      p_previous_value: options.previousValue || null,
      p_new_value: options.newValue || null,
    });

    if (error) {
      console.error('Error logging immutable event:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Failed to log immutable event:', err);
    return null;
  }
}

// Fetch immutable audit logs
export async function fetchImmutableAuditLogs(
  options: {
    limit?: number;
    offset?: number;
    eventType?: AuditEventType;
    startDate?: string;
    endDate?: string;
    resourceType?: string;
  } = {}
): Promise<{ logs: ImmutableAuditLog[]; count: number }> {
  const { limit = 50, offset = 0, eventType, startDate, endDate, resourceType } = options;

  let query = supabase
    .from('immutable_audit_log')
    .select('*', { count: 'exact' })
    .order('log_timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  if (startDate) {
    query = query.gte('log_timestamp', startDate);
  }

  if (endDate) {
    query = query.lte('log_timestamp', endDate);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching immutable audit logs:', error);
    throw error;
  }

  return {
    logs: (data || []) as ImmutableAuditLog[],
    count: count || 0,
  };
}

// Verify hash chain integrity
export async function verifyHashChainIntegrity(
  structureId: string,
  options: {
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<HashChainVerification | null> {
  try {
    const { data, error } = await supabase.rpc('verify_hash_chain_integrity', {
      p_structure_id: structureId,
      p_start_date: options.startDate || null,
      p_end_date: options.endDate || null,
    });

    if (error) {
      console.error('Error verifying hash chain:', error);
      return null;
    }

    // The function returns a table, so data is an array
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      return {
        is_valid: result.is_valid ?? true,
        total_logs: result.total_logs ?? 0,
        first_broken_at: result.first_broken_at ?? null,
        broken_log_id: result.broken_log_id ?? null,
        expected_hash: result.expected_hash ?? null,
        actual_hash: result.actual_hash ?? null,
      };
    }

    return {
      is_valid: true,
      total_logs: 0,
      first_broken_at: null,
      broken_log_id: null,
      expected_hash: null,
      actual_hash: null,
    };
  } catch (err) {
    console.error('Failed to verify hash chain:', err);
    return null;
  }
}

// Get audit stats
export async function getImmutableAuditStats(structureId: string): Promise<{
  totalLogs: number;
  logsToday: number;
  logsLast7Days: number;
  securityEvents: number;
  exports: number;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, todayResult, weekResult, securityResult, exportResult] = await Promise.all([
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId),
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('log_timestamp', todayStart),
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .gte('log_timestamp', sevenDaysAgo),
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('event_type', 'security_event'),
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('event_type', 'export'),
  ]);

  return {
    totalLogs: totalResult.count || 0,
    logsToday: todayResult.count || 0,
    logsLast7Days: weekResult.count || 0,
    securityEvents: securityResult.count || 0,
    exports: exportResult.count || 0,
  };
}
