import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { logActivity } from './activity';
import type { AntecedentType, AntecedentSeverity } from './antecedents';
import { createImportRecord } from './ocrImportHistory';

export interface OCRMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface OCRDiagnosis {
  name: string;
  date?: string;
}

export interface OCRImportResult {
  medicationsImported: number;
  diagnosesImported: number;
  proceduresImported: number;
  errors: string[];
  antecedentIds: string[];
}

/**
 * Import medications from OCR as active treatments (antecedents of type 'traitement_en_cours')
 */
export async function importMedicationsAsAntecedents(
  patientId: string,
  structureId: string,
  userId: string,
  medications: OCRMedication[],
  documentTitle?: string
): Promise<{ imported: number; errors: string[]; antecedentIds: string[] }> {
  const errors: string[] = [];
  const antecedentIds: string[] = [];
  let imported = 0;

  for (const med of medications) {
    try {
      // Build description with all medication details
      let description = med.name;
      if (med.dosage) description += ` - ${med.dosage}`;
      if (med.frequency) description += ` (${med.frequency})`;

      const notes = [
        med.duration ? `Durée: ${med.duration}` : null,
        documentTitle ? `Importé depuis: ${documentTitle}` : 'Importé depuis OCR',
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('patient_antecedents')
        .insert({
          patient_id: patientId,
          structure_id: structureId,
          type: 'traitement_en_cours' as AntecedentType,
          description,
          actif: true,
          severity: null as AntecedentSeverity | null,
          notes,
          created_by: userId,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error importing medication:', error);
        errors.push(`Échec import: ${med.name}`);
      } else {
        imported++;
        antecedentIds.push(data.id);
      }
    } catch (err) {
      console.error('Error importing medication:', err);
      errors.push(`Erreur: ${med.name}`);
    }
  }

  if (imported > 0) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: 'OCR_MEDICATIONS_IMPORTED',
      patientId,
      metadata: {
        count: imported,
        medications: medications.map(m => m.name),
        source: documentTitle || 'OCR',
      },
    });
  }

  return { imported, errors, antecedentIds };
}

/**
 * Import diagnoses from OCR as medical antecedents
 */
export async function importDiagnosesAsAntecedents(
  patientId: string,
  structureId: string,
  userId: string,
  diagnoses: string[],
  documentTitle?: string
): Promise<{ imported: number; errors: string[]; antecedentIds: string[] }> {
  const errors: string[] = [];
  const antecedentIds: string[] = [];
  let imported = 0;

  for (const diagnosis of diagnoses) {
    if (!diagnosis.trim()) continue;

    try {
      const notes = documentTitle 
        ? `Importé depuis: ${documentTitle}` 
        : 'Importé depuis OCR';

      const { data, error } = await supabase
        .from('patient_antecedents')
        .insert({
          patient_id: patientId,
          structure_id: structureId,
          type: 'medical' as AntecedentType,
          description: diagnosis.trim(),
          actif: true,
          severity: null as AntecedentSeverity | null,
          notes,
          created_by: userId,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error importing diagnosis:', error);
        errors.push(`Échec import: ${diagnosis}`);
      } else {
        imported++;
        antecedentIds.push(data.id);
      }
    } catch (err) {
      console.error('Error importing diagnosis:', err);
      errors.push(`Erreur: ${diagnosis}`);
    }
  }

  if (imported > 0) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: 'OCR_DIAGNOSES_IMPORTED',
      patientId,
      metadata: {
        count: imported,
        diagnoses,
        source: documentTitle || 'OCR',
      },
    });
  }

  return { imported, errors, antecedentIds };
}

/**
 * Import procedures from OCR as surgical antecedents
 */
export async function importProceduresAsAntecedents(
  patientId: string,
  structureId: string,
  userId: string,
  procedures: string[],
  documentTitle?: string
): Promise<{ imported: number; errors: string[]; antecedentIds: string[] }> {
  const errors: string[] = [];
  const antecedentIds: string[] = [];
  let imported = 0;

  for (const procedure of procedures) {
    if (!procedure.trim()) continue;

    try {
      const notes = documentTitle 
        ? `Importé depuis: ${documentTitle}` 
        : 'Importé depuis OCR';

      const { data, error } = await supabase
        .from('patient_antecedents')
        .insert({
          patient_id: patientId,
          structure_id: structureId,
          type: 'chirurgical' as AntecedentType,
          description: procedure.trim(),
          actif: true,
          severity: null as AntecedentSeverity | null,
          notes,
          created_by: userId,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error importing procedure:', error);
        errors.push(`Échec import: ${procedure}`);
      } else {
        imported++;
        antecedentIds.push(data.id);
      }
    } catch (err) {
      console.error('Error importing procedure:', err);
      errors.push(`Erreur: ${procedure}`);
    }
  }

  if (imported > 0) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: 'OCR_PROCEDURES_IMPORTED',
      patientId,
      metadata: {
        count: imported,
        procedures,
        source: documentTitle || 'OCR',
      },
    });
  }

  return { imported, errors, antecedentIds };
}

/**
 * Import all OCR data to patient file
 */
export async function importAllOCRData(
  patientId: string,
  structureId: string,
  userId: string,
  extractedData: {
    medications?: OCRMedication[];
    diagnoses?: string[];
    procedures?: string[];
  },
  documentTitle?: string,
  documentId?: string
): Promise<OCRImportResult> {
  const result: OCRImportResult = {
    medicationsImported: 0,
    diagnosesImported: 0,
    proceduresImported: 0,
    errors: [],
    antecedentIds: [],
  };

  // Import medications
  if (extractedData.medications && extractedData.medications.length > 0) {
    const medResult = await importMedicationsAsAntecedents(
      patientId,
      structureId,
      userId,
      extractedData.medications,
      documentTitle
    );
    result.medicationsImported = medResult.imported;
    result.errors.push(...medResult.errors);
    result.antecedentIds.push(...medResult.antecedentIds);
  }

  // Import diagnoses
  if (extractedData.diagnoses && extractedData.diagnoses.length > 0) {
    const diagResult = await importDiagnosesAsAntecedents(
      patientId,
      structureId,
      userId,
      extractedData.diagnoses,
      documentTitle
    );
    result.diagnosesImported = diagResult.imported;
    result.errors.push(...diagResult.errors);
    result.antecedentIds.push(...diagResult.antecedentIds);
  }

  // Import procedures
  if (extractedData.procedures && extractedData.procedures.length > 0) {
    const procResult = await importProceduresAsAntecedents(
      patientId,
      structureId,
      userId,
      extractedData.procedures,
      documentTitle
    );
    result.proceduresImported = procResult.imported;
    result.errors.push(...procResult.errors);
    result.antecedentIds.push(...procResult.antecedentIds);
  }

  // Create import history record if any items were imported
  const totalImported = result.medicationsImported + result.diagnosesImported + result.proceduresImported;
  if (totalImported > 0) {
    await createImportRecord({
      patientId,
      structureId,
      documentId,
      documentTitle,
      importedBy: userId,
      medicationsCount: result.medicationsImported,
      diagnosesCount: result.diagnosesImported,
      proceduresCount: result.proceduresImported,
      antecedentIds: result.antecedentIds,
    });
  }

  return result;
}
