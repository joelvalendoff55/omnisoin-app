import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type HealthCheckType = 
  | 'rls_integrity'
  | 'hash_chain_integrity'
  | 'rbac_enforcement'
  | 'audit_completeness'
  | 'consent_coverage'
  | 'data_encryption';

export type HealthCheckStatus = 'passed' | 'failed' | 'warning';

export interface HealthCheck {
  id: string;
  check_type: HealthCheckType;
  check_timestamp: string;
  status: HealthCheckStatus;
  details: Record<string, unknown> | null;
  structure_id: string | null;
  performed_by: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ComplianceDashboard {
  structure_id: string;
  structure_name: string;
  total_audit_logs: number;
  total_data_access_logs: number;
  isolation_alerts: number;
  gdpr_audit_count: number;
}

export interface CertificationReport {
  report_metadata: {
    generated_at: string;
    generated_by: string;
    structure_id: string;
    structure_name: string;
    period_start: string;
    period_end: string;
    report_type: string;
    version: string;
  };
  compliance_summary: {
    overall_status: 'COMPLIANT' | 'NON-COMPLIANT';
    rls_enabled: boolean;
    audit_immutable: boolean;
    hash_chain_valid: boolean;
    gdpr_exports_available: boolean;
  };
  patient_statistics: Record<string, number>;
  consultation_statistics: Record<string, number>;
  queue_statistics: Record<string, number>;
  consent_statistics: Record<string, number>;
  audit_statistics: Record<string, unknown>;
  security_statistics: Record<string, number>;
  export_statistics: Record<string, unknown>;
  health_checks: Array<{
    check_type: string;
    status: string;
    timestamp: string;
    duration_ms: number;
  }> | null;
}

export interface WorkflowSimulationResult {
  simulation_id: string;
  structure_id: string;
  dry_run: boolean;
  started_at: string;
  completed_at: string;
  total_steps: number;
  successful_steps: number;
  steps: Array<{
    step: number;
    name: string;
    success: boolean;
    duration_ms: number;
    [key: string]: unknown;
  }>;
  entities_created: Record<string, string> | null;
}

// Health check descriptions
export const HEALTH_CHECK_INFO: Record<HealthCheckType, { label: string; description: string; icon: string }> = {
  rls_integrity: {
    label: 'Intégrité RLS',
    description: 'Vérifie que toutes les tables ont des politiques RLS activées',
    icon: 'Shield',
  },
  hash_chain_integrity: {
    label: 'Intégrité Hash Chain',
    description: 'Vérifie l\'intégrité cryptographique des logs immuables',
    icon: 'Link',
  },
  rbac_enforcement: {
    label: 'Enforcement RBAC',
    description: 'Vérifie qu\'aucun accès non autorisé n\'a été tenté',
    icon: 'Lock',
  },
  audit_completeness: {
    label: 'Complétude Audit',
    description: 'Vérifie que tous les événements sont correctement loggés',
    icon: 'FileText',
  },
  consent_coverage: {
    label: 'Couverture Consentements',
    description: 'Vérifie le taux de couverture des consentements patients',
    icon: 'CheckCircle',
  },
  data_encryption: {
    label: 'Chiffrement Données',
    description: 'Vérifie que les champs sensibles sont chiffrés',
    icon: 'Key',
  },
};

export async function runHealthCheck(
  checkType: HealthCheckType,
  structureId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('run_system_health_check', {
      p_check_type: checkType,
      p_structure_id: structureId || null,
    });

    if (error) {
      // Log specific errors like missing digest() function without throwing
      if (error.message?.includes('function digest') || error.message?.includes('does not exist')) {
        console.warn('[SystemHealth] Extension pgcrypto may not be enabled:', error.message);
        return null;
      }
      console.error('[SystemHealth] Health check failed:', checkType, error.message);
      return null;
    }
    return data as string;
  } catch (err) {
    console.error('[SystemHealth] Unexpected error during health check:', err);
    return null;
  }
}

export async function fetchHealthChecks(
  structureId?: string,
  limit = 50
): Promise<HealthCheck[]> {
  let query = supabase
    .from('system_health_checks')
    .select('*')
    .order('check_timestamp', { ascending: false })
    .limit(limit);

  if (structureId) {
    query = query.eq('structure_id', structureId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as HealthCheck[];
}

export async function fetchLatestHealthChecks(
  structureId: string
): Promise<Record<HealthCheckType, HealthCheck | null>> {
  const checks = await fetchHealthChecks(structureId, 100);
  
  const result: Record<HealthCheckType, HealthCheck | null> = {
    rls_integrity: null,
    hash_chain_integrity: null,
    rbac_enforcement: null,
    audit_completeness: null,
    consent_coverage: null,
    data_encryption: null,
  };

  for (const check of checks) {
    const type = check.check_type as HealthCheckType;
    if (type in result && !result[type]) {
      result[type] = check;
    }
  }

  return result;
}

export async function fetchComplianceDashboard(): Promise<ComplianceDashboard[]> {
  const { data, error } = await supabase
    .from('system_compliance_dashboard')
    .select('*');

  if (error) throw error;
  return (data || []) as ComplianceDashboard[];
}

export async function generateCertificationReport(
  structureId: string,
  dateStart: Date,
  dateEnd: Date
): Promise<CertificationReport> {
  const { data, error } = await supabase.rpc('generate_certification_report', {
    p_structure_id: structureId,
    p_date_start: dateStart.toISOString(),
    p_date_end: dateEnd.toISOString(),
  });

  if (error) throw error;
  return data as unknown as CertificationReport;
}

export async function simulatePatientWorkflow(
  structureId: string,
  dryRun = true
): Promise<WorkflowSimulationResult> {
  const { data, error } = await supabase.rpc('simulate_patient_workflow', {
    p_structure_id: structureId,
    p_dry_run: dryRun,
  });

  if (error) throw error;
  return data as unknown as WorkflowSimulationResult;
}

export async function runAllHealthChecks(structureId: string): Promise<void> {
  const checkTypes: HealthCheckType[] = [
    'rls_integrity',
    'hash_chain_integrity',
    'rbac_enforcement',
    'audit_completeness',
    'consent_coverage',
    'data_encryption',
  ];

  // Run checks in parallel but don't fail if one fails
  await Promise.allSettled(
    checkTypes.map(checkType => runHealthCheck(checkType, structureId))
  );
}

export function getStatusColor(status: HealthCheckStatus | null): string {
  switch (status) {
    case 'passed':
      return 'text-green-600 bg-green-100';
    case 'warning':
      return 'text-yellow-600 bg-yellow-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

export function getComplianceColor(status: string | null): string {
  switch (status) {
    case 'COMPLIANT':
      return 'text-green-600 bg-green-100';
    case 'PARTIAL':
      return 'text-yellow-600 bg-yellow-100';
    case 'NON-COMPLIANT':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-muted-foreground bg-muted';
  }
}
