import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { logActivity } from './activity';

export interface OCRImportRecord {
  id: string;
  patient_id: string;
  structure_id: string;
  document_id: string | null;
  document_title: string | null;
  imported_by: string;
  imported_at: string;
  medications_count: number;
  diagnoses_count: number;
  procedures_count: number;
  antecedent_ids: string[];
  reverted_at: string | null;
  reverted_by: string | null;
  status: 'active' | 'reverted';
  // Joined data
  importer_name?: string;
  reverter_name?: string;
}

export interface CreateImportRecordParams {
  patientId: string;
  structureId: string;
  documentId?: string;
  documentTitle?: string;
  importedBy: string;
  medicationsCount: number;
  diagnosesCount: number;
  proceduresCount: number;
  antecedentIds: string[];
}

/**
 * Create a record of an OCR import for history tracking
 */
export async function createImportRecord(
  params: CreateImportRecordParams
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ocr_import_history')
      .insert({
        patient_id: params.patientId,
        structure_id: params.structureId,
        document_id: params.documentId || null,
        document_title: params.documentTitle || null,
        imported_by: params.importedBy,
        medications_count: params.medicationsCount,
        diagnoses_count: params.diagnosesCount,
        procedures_count: params.proceduresCount,
        antecedent_ids: params.antecedentIds,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating import record:', error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('Error creating import record:', err);
    return null;
  }
}

/**
 * Fetch OCR import history for a patient
 */
export async function fetchImportHistory(
  patientId: string
): Promise<OCRImportRecord[]> {
  const { data, error } = await supabase
    .from('ocr_import_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('imported_at', { ascending: false });

  if (error) {
    console.error('Error fetching import history:', error);
    return [];
  }

  // Fetch user names for importers and reverters
  const userIds = new Set<string>();
  data.forEach(record => {
    userIds.add(record.imported_by);
    if (record.reverted_by) userIds.add(record.reverted_by);
  });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', Array.from(userIds));

  const profileMap = new Map(
    profiles?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur']) || []
  );

  return data.map(record => ({
    ...record,
    status: record.status as 'active' | 'reverted',
    importer_name: profileMap.get(record.imported_by) || 'Utilisateur',
    reverter_name: record.reverted_by ? profileMap.get(record.reverted_by) || 'Utilisateur' : undefined,
  }));
}

/**
 * Revert an OCR import by deleting all associated antecedents
 */
export async function revertImport(
  importId: string,
  userId: string,
  structureId: string,
  patientId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    // Fetch the import record
    const { data: importRecord, error: fetchError } = await supabase
      .from('ocr_import_history')
      .select('*')
      .eq('id', importId)
      .single();

    if (fetchError || !importRecord) {
      return { success: false, deletedCount: 0, error: 'Import non trouvé' };
    }

    if (importRecord.status === 'reverted') {
      return { success: false, deletedCount: 0, error: 'Import déjà annulé' };
    }

    const antecedentIds = importRecord.antecedent_ids as string[];

    if (antecedentIds.length === 0) {
      // No antecedents to delete, just mark as reverted
      await supabase
        .from('ocr_import_history')
        .update({
          status: 'reverted',
          reverted_at: new Date().toISOString(),
          reverted_by: userId,
        })
        .eq('id', importId);

      return { success: true, deletedCount: 0 };
    }

    // Delete the antecedents
    const { error: deleteError } = await supabase
      .from('patient_antecedents')
      .delete()
      .in('id', antecedentIds);

    if (deleteError) {
      console.error('Error deleting antecedents:', deleteError);
      return { success: false, deletedCount: 0, error: 'Erreur lors de la suppression' };
    }

    // Mark import as reverted
    await supabase
      .from('ocr_import_history')
      .update({
        status: 'reverted',
        reverted_at: new Date().toISOString(),
        reverted_by: userId,
      })
      .eq('id', importId);

    // Log activity
    await logActivity({
      structureId,
      actorUserId: userId,
      action: 'OCR_IMPORT_REVERTED',
      patientId,
      metadata: {
        importId,
        deletedAntecedents: antecedentIds.length,
        documentTitle: importRecord.document_title,
      },
    });

    return { success: true, deletedCount: antecedentIds.length };
  } catch (err) {
    console.error('Error reverting import:', err);
    return { success: false, deletedCount: 0, error: 'Erreur inattendue' };
  }
}
