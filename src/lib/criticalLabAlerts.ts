import { supabase } from '@/integrations/supabase/client';
import { createNotification } from './notifications';

export interface LabResult {
  name: string;
  value: string;
  unit?: string;
  reference?: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
}

export interface CriticalLabAlert {
  id: string;
  document_id: string;
  patient_id: string;
  structure_id: string;
  lab_result: LabResult;
  severity: 'warning' | 'critical';
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

/**
 * Analyzes OCR extracted data for critical lab results and creates alerts
 */
export async function processLabResultsForAlerts(
  documentId: string,
  patientId: string,
  structureId: string,
  extractedData: Record<string, unknown>,
  createdByUserId: string
): Promise<{ alertsCreated: number; criticalCount: number; warningCount: number }> {
  const labResults = (extractedData.labResults || []) as LabResult[];
  
  // Filter for critical and abnormal results
  const criticalResults = labResults.filter(r => r.status === 'critical');
  const warningResults = labResults.filter(r => r.status === 'high' || r.status === 'low');

  let alertsCreated = 0;

  // Get patient info for notification
  const { data: patient } = await supabase
    .from('patients')
    .select('first_name, last_name')
    .eq('id', patientId)
    .single();

  const patientName = patient 
    ? `${patient.first_name} ${patient.last_name}`
    : 'Patient';

  // Get team members to notify (practitioners with medical role)
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('structure_id', structureId);

  const userIdsToNotify = (teamMembers || [])
    .filter((m): m is { user_id: string } => Boolean(m.user_id))
    .map(m => m.user_id);
  
  // Always notify the document creator
  if (createdByUserId && !userIdsToNotify.includes(createdByUserId)) {
    userIdsToNotify.push(createdByUserId);
  }

  // Create notifications for critical results
  for (const result of criticalResults) {
    for (const userId of userIdsToNotify) {
      try {
        await createNotification(
          userId,
          structureId,
          `🚨 Résultat critique: ${result.name}`,
          `${patientName} - ${result.name}: ${result.value}${result.unit ? ` ${result.unit}` : ''} (CRITIQUE)`,
          'error',
          `/patients/${patientId}`
        );
        alertsCreated++;
      } catch (err) {
        console.error('Failed to create critical alert notification:', err);
      }
    }
  }

  // Create notifications for warning results (high/low)
  for (const result of warningResults) {
    for (const userId of userIdsToNotify) {
      try {
        await createNotification(
          userId,
          structureId,
          `⚠️ Résultat anormal: ${result.name}`,
          `${patientName} - ${result.name}: ${result.value}${result.unit ? ` ${result.unit}` : ''} (${result.status === 'high' ? 'Élevé' : 'Bas'})`,
          'warning',
          `/patients/${patientId}`
        );
        alertsCreated++;
      } catch (err) {
        console.error('Failed to create warning alert notification:', err);
      }
    }
  }

  // Log activity for critical results
  if (criticalResults.length > 0) {
    try {
      await supabase.from('activity_logs').insert({
        action: 'CRITICAL_LAB_RESULT_DETECTED',
        patient_id: patientId,
        structure_id: structureId,
        actor_user_id: createdByUserId,
        metadata: {
          document_id: documentId,
          critical_results: criticalResults.map(r => ({
            name: r.name,
            value: r.value,
            unit: r.unit,
          })),
        },
      });
    } catch (err) {
      console.error('Failed to log critical result activity:', err);
    }
  }

  return {
    alertsCreated,
    criticalCount: criticalResults.length,
    warningCount: warningResults.length,
  };
}

/**
 * Fetches recent critical lab alerts for a structure
 */
export async function fetchRecentCriticalAlerts(
  structureId: string,
  limit = 10
): Promise<{
  documentId: string;
  patientId: string;
  patientName: string;
  results: LabResult[];
  documentTitle: string;
  createdAt: string;
}[]> {
  // Get recent OCR results with critical lab values
  const { data: ocrResults, error } = await supabase
    .from('document_ocr')
    .select(`
      document_id,
      extracted_data,
      created_at,
      documents!inner (
        id,
        title,
        patient_id,
        structure_id,
        patients (
          first_name,
          last_name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !ocrResults) {
    console.error('Error fetching OCR results for alerts:', error);
    return [];
  }

  const alerts: {
    documentId: string;
    patientId: string;
    patientName: string;
    results: LabResult[];
    documentTitle: string;
    createdAt: string;
  }[] = [];

  for (const ocr of ocrResults) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = ocr.documents as any;
    if (!doc || doc.structure_id !== structureId) continue;

    const extractedData = ocr.extracted_data as Record<string, unknown>;
    const labResults = (extractedData?.labResults || []) as LabResult[];
    
    const criticalResults = labResults.filter(
      r => r.status === 'critical' || r.status === 'high' || r.status === 'low'
    );

    if (criticalResults.length > 0) {
      const patient = doc.patients as { first_name: string; last_name: string } | null;
      alerts.push({
        documentId: doc.id,
        patientId: doc.patient_id,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Patient inconnu',
        results: criticalResults,
        documentTitle: doc.title,
        createdAt: ocr.created_at,
      });
    }

    if (alerts.length >= limit) break;
  }

  return alerts;
}
