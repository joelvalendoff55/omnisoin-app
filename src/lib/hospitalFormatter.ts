import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HospitalPassage, PASSAGE_TYPE_LABELS, RISK_LEVEL_LABELS, TacheVille } from '@/lib/hospitalPassages';

export function formatHospitalPassageForCopy(passage: HospitalPassage, patientName?: string): string {
  const lines: string[] = [];
  
  lines.push('=== PASSAGE HOSPITALIER ===');
  lines.push('');
  
  if (patientName) {
    lines.push(`Patient: ${patientName}`);
  }
  
  lines.push(`Date: ${format(new Date(passage.passage_date), 'dd MMMM yyyy', { locale: fr })}`);
  lines.push(`Type: ${PASSAGE_TYPE_LABELS[passage.passage_type]}`);
  lines.push(`Établissement: ${passage.etablissement}`);
  lines.push(`Niveau de risque: ${RISK_LEVEL_LABELS[passage.risk_level]}`);
  
  if (passage.motif) {
    lines.push('');
    lines.push('MOTIF DE RECOURS:');
    lines.push(passage.motif);
  }
  
  if (passage.diagnostics) {
    lines.push('');
    lines.push('DIAGNOSTICS:');
    lines.push(passage.diagnostics);
  }
  
  if (passage.examens_cles) {
    lines.push('');
    lines.push('EXAMENS CLÉS:');
    lines.push(passage.examens_cles);
  }
  
  if (passage.traitements) {
    lines.push('');
    lines.push('TRAITEMENTS:');
    lines.push(passage.traitements);
  }
  
  if (passage.suivi_recommande) {
    lines.push('');
    lines.push('SUIVI RECOMMANDÉ:');
    lines.push(passage.suivi_recommande);
  }
  
  const taches = passage.taches_ville as TacheVille[] | null;
  if (taches && taches.length > 0) {
    lines.push('');
    lines.push('TÂCHES À FAIRE EN VILLE:');
    taches.forEach((tache, idx) => {
      const status = tache.completed ? '✓' : '○';
      lines.push(`  ${status} ${idx + 1}. ${tache.label}`);
    });
  }
  
  if (passage.notes) {
    lines.push('');
    lines.push('NOTES:');
    lines.push(passage.notes);
  }
  
  lines.push('');
  lines.push('---');
  lines.push(`Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`);
  
  return lines.join('\n');
}

export function formatHospitalPassagesReport(passages: HospitalPassage[], patientName?: string): string {
  if (passages.length === 0) {
    return 'Aucun passage hospitalier enregistré.';
  }
  
  const lines: string[] = [];
  
  lines.push('╔════════════════════════════════════════════════════════════╗');
  lines.push('║          RAPPORT DES PASSAGES HOSPITALIERS                 ║');
  lines.push(`║          Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}                   ║`);
  lines.push('╚════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  if (patientName) {
    lines.push(`Patient: ${patientName}`);
    lines.push('');
  }
  
  lines.push(`Total: ${passages.length} passage(s)`);
  lines.push('');
  
  // Stats
  const urgences = passages.filter(p => p.passage_type === 'urgences').length;
  const hospitalisations = passages.filter(p => p.passage_type === 'hospitalisation').length;
  const highRisk = passages.filter(p => p.risk_level === 'eleve').length;
  
  lines.push('STATISTIQUES:');
  lines.push(`  - Urgences: ${urgences}`);
  lines.push(`  - Hospitalisations: ${hospitalisations}`);
  lines.push(`  - Passages à risque élevé: ${highRisk}`);
  lines.push('');
  lines.push('════════════════════════════════════════════════════════════');
  
  passages.forEach((passage, idx) => {
    lines.push('');
    lines.push(`--- Passage ${idx + 1} ---`);
    lines.push(formatHospitalPassageForCopy(passage));
  });
  
  return lines.join('\n');
}

export interface HospitalPassageStats {
  total: number;
  urgences: number;
  hospitalisations: number;
  highRisk: number;
  lastPassageDate: string | null;
  pendingTasks: number;
}

export function calculatePassageStats(passages: HospitalPassage[]): HospitalPassageStats {
  const urgences = passages.filter(p => p.passage_type === 'urgences').length;
  const hospitalisations = passages.filter(p => p.passage_type === 'hospitalisation').length;
  const highRisk = passages.filter(p => p.risk_level === 'eleve').length;
  
  let pendingTasks = 0;
  passages.forEach(p => {
    const taches = p.taches_ville as TacheVille[] | null;
    if (taches) {
      pendingTasks += taches.filter(t => !t.completed).length;
    }
  });
  
  const sortedPassages = [...passages].sort(
    (a, b) => new Date(b.passage_date).getTime() - new Date(a.passage_date).getTime()
  );
  
  return {
    total: passages.length,
    urgences,
    hospitalisations,
    highRisk,
    lastPassageDate: sortedPassages.length > 0 ? sortedPassages[0].passage_date : null,
    pendingTasks,
  };
}
