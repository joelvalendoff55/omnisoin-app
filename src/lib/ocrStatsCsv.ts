import { OCRImportStats } from './ocrStats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Generate CSV content from OCR stats
 */
export function generateOCRStatsCSV(stats: OCRImportStats, structureName?: string): string {
  const lines: string[] = [];
  const now = new Date();
  
  // Header
  lines.push('RAPPORT STATISTIQUES IMPORTS OCR');
  lines.push(`Structure: ${structureName || 'Non spécifiée'}`);
  lines.push(`Généré le: ${format(now, 'dd MMMM yyyy à HH:mm', { locale: fr })}`);
  lines.push('');
  
  // Summary section
  lines.push('=== RÉSUMÉ ===');
  lines.push(`Total imports;${stats.totalImports}`);
  lines.push(`Imports actifs;${stats.activeImports}`);
  lines.push(`Imports annulés;${stats.revertedImports}`);
  lines.push(`Traitements importés;${stats.totalMedications}`);
  lines.push(`Diagnostics importés;${stats.totalDiagnoses}`);
  lines.push(`Interventions importées;${stats.totalProcedures}`);
  lines.push('');
  
  // By period section
  lines.push('=== ÉVOLUTION MENSUELLE ===');
  lines.push('Période;Imports;Traitements;Diagnostics;Interventions');
  stats.byPeriod.forEach(period => {
    lines.push(`${period.label};${period.imports};${period.medications};${period.diagnoses};${period.procedures}`);
  });
  lines.push('');
  
  // By practitioner section
  lines.push('=== PAR PRATICIEN ===');
  lines.push('Praticien;Total imports;Traitements;Diagnostics;Interventions;Annulés');
  stats.byPractitioner.forEach(p => {
    lines.push(`${p.name};${p.totalImports};${p.medicationsCount};${p.diagnosesCount};${p.proceduresCount};${p.revertedCount}`);
  });
  lines.push('');
  
  // Recent activity section
  lines.push('=== ACTIVITÉ RÉCENTE ===');
  lines.push('Date;Document;Praticien;Traitements;Diagnostics;Interventions;Statut');
  stats.recentActivity.forEach(activity => {
    const date = format(new Date(activity.importedAt), 'dd/MM/yyyy HH:mm', { locale: fr });
    const status = activity.status === 'active' ? 'Actif' : 'Annulé';
    const docTitle = (activity.documentTitle || 'Document OCR').replace(/;/g, ',');
    lines.push(`${date};${docTitle};${activity.importerName};${activity.medicationsCount};${activity.diagnosesCount};${activity.proceduresCount};${status}`);
  });
  
  return lines.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export OCR stats as CSV file
 */
export function exportOCRStatsToCSV(stats: OCRImportStats, structureName?: string): void {
  const csvContent = generateOCRStatsCSV(stats, structureName);
  const date = format(new Date(), 'yyyy-MM-dd');
  const filename = `statistiques-ocr-${date}.csv`;
  downloadCSV(csvContent, filename);
}
