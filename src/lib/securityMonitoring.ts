import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface SecurityStats {
  totalAuditEvents: number;
  securityEventsToday: number;
  rbacViolations24h: number;
  dataModifications7d: number;
  exportsToday: number;
  hashChainValid: boolean | null;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: 'security_event' | 'rbac_violation' | 'data_modification' | 'export' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  userId: string | null;
  userName?: string;
  resourceType: string | null;
  resourceId: string | null;
  details?: Record<string, unknown>;
}

export interface RBACViolation {
  id: string;
  consultationId: string;
  fieldName: string;
  attemptedBy: string;
  attemptedByRole: string;
  timestamp: string;
  isMedicalDecision: boolean;
  oldValue: string | null;
  newValue: string | null;
  userName?: string;
}

// Fetch security dashboard stats
export async function getSecurityStats(structureId: string): Promise<SecurityStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalResult,
    securityTodayResult,
    modificationsResult,
    exportsTodayResult,
  ] = await Promise.all([
    // Total audit events
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId),
    // Security events today
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('event_type', 'security_event')
      .gte('log_timestamp', todayStart),
    // Data modifications last 7 days
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('event_type', 'data_modification')
      .gte('log_timestamp', sevenDaysAgo),
    // Exports today
    supabase
      .from('immutable_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('structure_id', structureId)
      .eq('event_type', 'export')
      .gte('log_timestamp', todayStart),
  ]);

  // Count RBAC violations (blocked field edits) in last 24h
  // We look for consultation_field_audit entries - those are modifications attempts
  // For now, we count all medical decision field changes as potential concerns
  const { count: rbacCount } = await supabase
    .from('consultation_field_audit')
    .select('id', { count: 'exact', head: true })
    .eq('structure_id', structureId)
    .eq('is_medical_decision', true)
    .gte('changed_at', yesterday);

  return {
    totalAuditEvents: totalResult.count || 0,
    securityEventsToday: securityTodayResult.count || 0,
    rbacViolations24h: rbacCount || 0,
    dataModifications7d: modificationsResult.count || 0,
    exportsToday: exportsTodayResult.count || 0,
    hashChainValid: null, // Will be checked separately
  };
}

// Fetch recent security events
export async function getRecentSecurityEvents(
  structureId: string,
  limit: number = 20
): Promise<SecurityEvent[]> {
  const { data, error } = await supabase
    .from('immutable_audit_log')
    .select('*')
    .eq('structure_id', structureId)
    .in('event_type', ['security_event', 'data_modification', 'export', 'data_access'])
    .order('log_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching security events:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    timestamp: log.log_timestamp,
    eventType: log.event_type as SecurityEvent['eventType'],
    severity: getSeverityFromEventType(log.event_type, log.action),
    action: log.action,
    userId: log.user_id,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    details: log.new_value as Record<string, unknown> | undefined,
  }));
}

// Fetch RBAC field audit (medical decision modifications)
export async function getRBACFieldAudit(
  structureId: string,
  limit: number = 20
): Promise<RBACViolation[]> {
  const { data, error } = await supabase
    .from('consultation_field_audit')
    .select('*')
    .eq('structure_id', structureId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching RBAC field audit:', error);
    return [];
  }

  return (data || []).map(audit => ({
    id: audit.id,
    consultationId: audit.consultation_id,
    fieldName: audit.field_name,
    attemptedBy: audit.changed_by,
    attemptedByRole: audit.changed_by_role,
    timestamp: audit.changed_at,
    isMedicalDecision: audit.is_medical_decision,
    oldValue: audit.old_value,
    newValue: audit.new_value,
  }));
}

// Fetch recent sensitive data access from activity_logs
export async function getRecentDataAccess(
  structureId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  action: string;
  actorUserId: string | null;
  patientId: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}>> {
  const sensitiveActions = [
    'DATA_ACCESS_GRANTED',
    'DATA_ACCESS_DENIED',
    'PATIENT_VIEWED',
    'CONSULTATION_VIEWED',
    'DOCUMENT_DOWNLOADED',
    'EXPORT_REQUESTED',
  ];

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('structure_id', structureId)
    .in('action', sensitiveActions)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching data access logs:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    action: log.action,
    actorUserId: log.actor_user_id,
    patientId: log.patient_id,
    timestamp: log.created_at,
    metadata: log.metadata as Record<string, unknown> | null,
  }));
}

function getSeverityFromEventType(eventType: string, action: string): SecurityEvent['severity'] {
  if (eventType === 'security_event') {
    if (action.toLowerCase().includes('violation') || action.toLowerCase().includes('denied')) {
      return 'high';
    }
    if (action.toLowerCase().includes('failed') || action.toLowerCase().includes('error')) {
      return 'medium';
    }
    return 'low';
  }
  
  if (eventType === 'export') {
    return 'medium';
  }
  
  if (eventType === 'data_modification') {
    return 'low';
  }
  
  return 'low';
}

// Security events temporal data for chart
export interface SecurityEventsByDay {
  date: string;
  label: string;
  securityEvents: number;
  dataModifications: number;
  exports: number;
  rbacChanges: number;
}

export async function getSecurityEventsTimeline(
  structureId: string,
  days: number = 14
): Promise<SecurityEventsByDay[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Fetch all events from the period
  const { data: auditLogs, error: auditError } = await supabase
    .from('immutable_audit_log')
    .select('log_timestamp, event_type')
    .eq('structure_id', structureId)
    .gte('log_timestamp', startDate.toISOString())
    .order('log_timestamp', { ascending: true });

  const { data: rbacLogs, error: rbacError } = await supabase
    .from('consultation_field_audit')
    .select('changed_at')
    .eq('structure_id', structureId)
    .gte('changed_at', startDate.toISOString());

  if (auditError) console.error('Error fetching audit logs for timeline:', auditError);
  if (rbacError) console.error('Error fetching RBAC logs for timeline:', rbacError);

  // Initialize all days
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const timeline: SecurityEventsByDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    timeline.push({
      date: dateStr,
      label: `${dayLabels[date.getDay()]} ${date.getDate()}`,
      securityEvents: 0,
      dataModifications: 0,
      exports: 0,
      rbacChanges: 0,
    });
  }

  // Count audit events by day
  (auditLogs || []).forEach(log => {
    const dateStr = log.log_timestamp.split('T')[0];
    const day = timeline.find(d => d.date === dateStr);
    if (day) {
      switch (log.event_type) {
        case 'security_event':
          day.securityEvents++;
          break;
        case 'data_modification':
          day.dataModifications++;
          break;
        case 'export':
          day.exports++;
          break;
      }
    }
  });

  // Count RBAC changes by day
  (rbacLogs || []).forEach(log => {
    const dateStr = log.changed_at.split('T')[0];
    const day = timeline.find(d => d.date === dateStr);
    if (day) {
      day.rbacChanges++;
    }
  });

  return timeline;
}

// Field name labels for display
export const FIELD_NAME_LABELS: Record<string, string> = {
  diagnosis: 'Diagnostic',
  conclusion: 'Conclusion',
  treatment_plan: 'Plan de traitement',
  prescription: 'Prescription',
  medical_notes: 'Notes médicales',
  exam_findings: 'Résultats d\'examen',
  clinical_notes: 'Notes cliniques',
  recommendations: 'Recommandations',
};

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  coordinator: 'Coordinateur',
  practitioner: 'Praticien',
  doctor: 'Médecin',
  nurse: 'Infirmier',
  ipa: 'IPA',
  assistant: 'Assistant',
};
