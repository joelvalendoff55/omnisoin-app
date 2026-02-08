import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface OCRImportStats {
  totalImports: number;
  activeImports: number;
  revertedImports: number;
  totalMedications: number;
  totalDiagnoses: number;
  totalProcedures: number;
  byPractitioner: PractitionerStats[];
  byPeriod: PeriodStats[];
  recentActivity: RecentImport[];
}

export interface PractitionerStats {
  userId: string;
  name: string;
  totalImports: number;
  medicationsCount: number;
  diagnosesCount: number;
  proceduresCount: number;
  revertedCount: number;
}

export interface PeriodStats {
  period: string;
  label: string;
  imports: number;
  medications: number;
  diagnoses: number;
  procedures: number;
}

export interface RecentImport {
  id: string;
  documentTitle: string | null;
  importerName: string;
  importedAt: string;
  medicationsCount: number;
  diagnosesCount: number;
  proceduresCount: number;
  status: 'active' | 'reverted';
}

/**
 * Fetch OCR import statistics for a structure
 */
export async function fetchOCRStats(structureId: string): Promise<OCRImportStats | null> {
  try {
    // Fetch all imports for the structure
    const { data: imports, error } = await supabase
      .from('ocr_import_history')
      .select('*')
      .eq('structure_id', structureId)
      .order('imported_at', { ascending: false });

    if (error) {
      console.error('Error fetching OCR stats:', error);
      return null;
    }

    if (!imports || imports.length === 0) {
      return {
        totalImports: 0,
        activeImports: 0,
        revertedImports: 0,
        totalMedications: 0,
        totalDiagnoses: 0,
        totalProcedures: 0,
        byPractitioner: [],
        byPeriod: [],
        recentActivity: [],
      };
    }

    // Get user profiles for names
    const userIds = [...new Set(imports.map(i => i.imported_by))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    const profileMap = new Map(
      profiles?.map(p => [
        p.id, 
        `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur'
      ]) || []
    );

    // Calculate totals
    const activeImports = imports.filter(i => i.status === 'active');
    const revertedImports = imports.filter(i => i.status === 'reverted');

    const totalMedications = activeImports.reduce((sum, i) => sum + (i.medications_count || 0), 0);
    const totalDiagnoses = activeImports.reduce((sum, i) => sum + (i.diagnoses_count || 0), 0);
    const totalProcedures = activeImports.reduce((sum, i) => sum + (i.procedures_count || 0), 0);

    // Stats by practitioner
    const practitionerMap = new Map<string, PractitionerStats>();
    imports.forEach(imp => {
      const existing = practitionerMap.get(imp.imported_by) || {
        userId: imp.imported_by,
        name: profileMap.get(imp.imported_by) || 'Utilisateur',
        totalImports: 0,
        medicationsCount: 0,
        diagnosesCount: 0,
        proceduresCount: 0,
        revertedCount: 0,
      };

      existing.totalImports++;
      if (imp.status === 'active') {
        existing.medicationsCount += imp.medications_count || 0;
        existing.diagnosesCount += imp.diagnoses_count || 0;
        existing.proceduresCount += imp.procedures_count || 0;
      } else {
        existing.revertedCount++;
      }

      practitionerMap.set(imp.imported_by, existing);
    });

    const byPractitioner = Array.from(practitionerMap.values())
      .sort((a, b) => b.totalImports - a.totalImports);

    // Stats by period (last 6 months)
    const periodMap = new Map<string, PeriodStats>();
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      periodMap.set(key, {
        period: key,
        label,
        imports: 0,
        medications: 0,
        diagnoses: 0,
        procedures: 0,
      });
    }

    imports.forEach(imp => {
      const date = new Date(imp.imported_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (periodMap.has(key)) {
        const existing = periodMap.get(key)!;
        existing.imports++;
        if (imp.status === 'active') {
          existing.medications += imp.medications_count || 0;
          existing.diagnoses += imp.diagnoses_count || 0;
          existing.procedures += imp.procedures_count || 0;
        }
      }
    });

    const byPeriod = Array.from(periodMap.values());

    // Recent activity (last 10)
    const recentActivity: RecentImport[] = imports.slice(0, 10).map(imp => ({
      id: imp.id,
      documentTitle: imp.document_title,
      importerName: profileMap.get(imp.imported_by) || 'Utilisateur',
      importedAt: imp.imported_at,
      medicationsCount: imp.medications_count || 0,
      diagnosesCount: imp.diagnoses_count || 0,
      proceduresCount: imp.procedures_count || 0,
      status: imp.status as 'active' | 'reverted',
    }));

    return {
      totalImports: imports.length,
      activeImports: activeImports.length,
      revertedImports: revertedImports.length,
      totalMedications,
      totalDiagnoses,
      totalProcedures,
      byPractitioner,
      byPeriod,
      recentActivity,
    };
  } catch (err) {
    console.error('Error fetching OCR stats:', err);
    return null;
  }
}
