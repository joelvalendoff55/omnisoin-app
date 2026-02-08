import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Types for exports
export type ExportType = 
  | 'rgpd_patient_data'
  | 'rgpd_rectification'
  | 'rgpd_portability'
  | 'has_certification'
  | 'medical_legal_archive'
  | 'audit_trail';

export type ExportFormat = 'pdf' | 'json' | 'csv' | 'xml';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface ExportRequest {
  id: string;
  requester_id: string;
  structure_id: string;
  patient_id: string | null;
  export_type: ExportType;
  export_format: ExportFormat;
  legal_basis: string;
  justification: string;
  date_range_start: string | null;
  date_range_end: string | null;
  status: ExportStatus;
  file_url: string | null;
  file_hash: string | null;
  expiration_date: string | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  // Joined data
  requester_name?: string;
  patient_name?: string;
}

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  rgpd_patient_data: 'RGPD - Accès patient (Art. 15)',
  rgpd_rectification: 'RGPD - Rectification (Art. 16)',
  rgpd_portability: 'RGPD - Portabilité (Art. 20)',
  has_certification: 'Certification HAS',
  medical_legal_archive: 'Archive médico-légale',
  audit_trail: 'Piste d\'audit',
};

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  json: 'JSON',
  csv: 'CSV',
  xml: 'XML',
};

export const EXPORT_STATUS_LABELS: Record<ExportStatus, string> = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échec',
  expired: 'Expiré',
};

export const EXPORT_STATUS_COLORS: Record<ExportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export const LEGAL_BASIS_OPTIONS = [
  { value: 'rgpd_art15', label: 'RGPD Article 15 - Droit d\'accès' },
  { value: 'rgpd_art16', label: 'RGPD Article 16 - Droit de rectification' },
  { value: 'rgpd_art20', label: 'RGPD Article 20 - Droit à la portabilité' },
  { value: 'has_certification', label: 'Certification HAS' },
  { value: 'legal_request', label: 'Réquisition judiciaire' },
  { value: 'medical_archive', label: 'Archivage médico-légal' },
  { value: 'internal_audit', label: 'Audit interne' },
] as const;

// Create export request
export async function createExportRequest(
  request: {
    patientId?: string;
    exportType: ExportType;
    exportFormat: ExportFormat;
    legalBasis: string;
    justification: string;
    dateRangeStart?: string;
    dateRangeEnd?: string;
  }
): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('User not authenticated');
  }

  // Get structure_id from org_members (source of truth)
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('structure_id')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!orgMember?.structure_id) {
    throw new Error('User has no associated structure');
  }

  const { data, error } = await supabase
    .from('export_requests')
    .insert({
      requester_id: userData.user.id,
      structure_id: orgMember.structure_id,
      patient_id: request.patientId || null,
      export_type: request.exportType,
      export_format: request.exportFormat,
      legal_basis: request.legalBasis,
      justification: request.justification,
      date_range_start: request.dateRangeStart || null,
      date_range_end: request.dateRangeEnd || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating export request:', error);
    throw error;
  }

  return data?.id || null;
}

// Fetch export requests
export async function fetchExportRequests(
  options: {
    limit?: number;
    offset?: number;
    status?: ExportStatus;
    exportType?: ExportType;
    patientId?: string;
  } = {}
): Promise<{ requests: ExportRequest[]; count: number }> {
  const { limit = 50, offset = 0, status, exportType, patientId } = options;

  let query = supabase
    .from('export_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (exportType) {
    query = query.eq('export_type', exportType);
  }

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching export requests:', error);
    throw error;
  }

  return {
    requests: (data || []) as ExportRequest[],
    count: count || 0,
  };
}

// Generate RGPD patient export
export async function generateRGPDExport(
  patientId: string,
  exportType: ExportType
): Promise<Json | null> {
  try {
    const { data, error } = await supabase.rpc('generate_rgpd_patient_export', {
      p_patient_id: patientId,
      p_export_type: exportType,
    });

    if (error) {
      console.error('Error generating RGPD export:', error);
      return null;
    }

    return data as Json;
  } catch (err) {
    console.error('Failed to generate RGPD export:', err);
    return null;
  }
}

// Generate HAS audit export
export async function generateHASExport(
  structureId: string,
  dateStart: string,
  dateEnd: string
): Promise<Json | null> {
  try {
    const { data, error } = await supabase.rpc('generate_has_audit_export', {
      p_structure_id: structureId,
      p_date_start: dateStart,
      p_date_end: dateEnd,
    });

    if (error) {
      console.error('Error generating HAS export:', error);
      return null;
    }

    return data as Json;
  } catch (err) {
    console.error('Failed to generate HAS export:', err);
    return null;
  }
}

// Update export request status
export async function updateExportStatus(
  requestId: string,
  status: ExportStatus,
  options: {
    fileUrl?: string;
    fileHash?: string;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    ...(status === 'completed' && { completed_at: new Date().toISOString() }),
    ...(options.fileUrl && { file_url: options.fileUrl }),
    ...(options.fileHash && { file_hash: options.fileHash }),
    ...(options.errorMessage && { error_message: options.errorMessage }),
  };

  const { error } = await supabase
    .from('export_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    console.error('Error updating export status:', error);
    throw error;
  }
}

// Get export stats
export async function getExportStats(structureId: string): Promise<{
  totalExports: number;
  pendingExports: number;
  completedExports: number;
  failedExports: number;
  rgpdExports: number;
  hasExports: number;
}> {
  const [totalResult, pendingResult, completedResult, failedResult, rgpdResult, hasResult] = 
    await Promise.all([
      supabase
        .from('export_requests')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId),
      supabase
        .from('export_requests')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('status', 'pending'),
      supabase
        .from('export_requests')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('status', 'completed'),
      supabase
        .from('export_requests')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('status', 'failed'),
      supabase
        .from('export_requests')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .in('export_type', ['rgpd_patient_data', 'rgpd_rectification', 'rgpd_portability']),
      supabase
        .from('export_requests')
        .select('id', { count: 'exact', head: true })
        .eq('structure_id', structureId)
        .eq('export_type', 'has_certification'),
    ]);

  return {
    totalExports: totalResult.count || 0,
    pendingExports: pendingResult.count || 0,
    completedExports: completedResult.count || 0,
    failedExports: failedResult.count || 0,
    rgpdExports: rgpdResult.count || 0,
    hasExports: hasResult.count || 0,
  };
}
