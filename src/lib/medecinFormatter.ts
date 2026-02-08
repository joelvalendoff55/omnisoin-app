import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DiagnosticAnalysis {
  id: string;
  symptoms: string[];
  clinical_signs: string[];
  hypotheses: string[];
  differential_diagnoses: string[];
  recommended_exams: string[];
  vigilance_points: string[];
  created_at: string;
  patient_name?: string;
}

export interface LLMQuery {
  id: string;
  model: 'perplexity' | 'gemini' | 'chatgpt';
  query: string;
  response: string;
  sources: string[];
  created_at: string;
}

export interface MedicalNote {
  id: string;
  patient_id: string;
  patient_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalReference {
  id: string;
  source: 'has' | 'vidal' | 'cim10' | 'autre';
  title: string;
  description: string;
  url: string;
  is_favorite: boolean;
}

const MODEL_LABELS: Record<string, string> = {
  perplexity: 'Perplexity',
  gemini: 'Google Gemini',
  chatgpt: 'ChatGPT',
};

const SOURCE_LABELS: Record<string, string> = {
  has: 'HAS',
  vidal: 'Vidal',
  cim10: 'CIM-10',
  autre: 'Autre',
};

export function formatDiagnosticAnalysis(analysis: DiagnosticAnalysis): string {
  const lines: string[] = [];
  
  lines.push('=== ANALYSE DIAGNOSTIQUE ===');
  lines.push('');
  
  if (analysis.patient_name) {
    lines.push(`Patient: ${analysis.patient_name}`);
  }
  
  lines.push(`Date: ${format(new Date(analysis.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}`);
  lines.push('');
  
  if (analysis.symptoms.length > 0) {
    lines.push('SYMPTÔMES RAPPORTÉS:');
    analysis.symptoms.forEach((symptom, idx) => {
      lines.push(`  ${idx + 1}. ${symptom}`);
    });
    lines.push('');
  }
  
  if (analysis.clinical_signs.length > 0) {
    lines.push('SIGNES CLINIQUES:');
    analysis.clinical_signs.forEach((sign, idx) => {
      lines.push(`  ${idx + 1}. ${sign}`);
    });
    lines.push('');
  }
  
  if (analysis.hypotheses.length > 0) {
    lines.push('HYPOTHÈSES DIAGNOSTIQUES:');
    analysis.hypotheses.forEach((hypothesis, idx) => {
      lines.push(`  ${idx + 1}. ${hypothesis}`);
    });
    lines.push('');
  }
  
  if (analysis.differential_diagnoses.length > 0) {
    lines.push('DIAGNOSTICS DIFFÉRENTIELS:');
    analysis.differential_diagnoses.forEach((diag, idx) => {
      lines.push(`  ${idx + 1}. ${diag}`);
    });
    lines.push('');
  }
  
  if (analysis.recommended_exams.length > 0) {
    lines.push('EXAMENS RECOMMANDÉS:');
    analysis.recommended_exams.forEach((exam, idx) => {
      lines.push(`  ${idx + 1}. ${exam}`);
    });
    lines.push('');
  }
  
  if (analysis.vigilance_points.length > 0) {
    lines.push('⚠️ POINTS DE VIGILANCE:');
    analysis.vigilance_points.forEach((point, idx) => {
      lines.push(`  ${idx + 1}. ${point}`);
    });
    lines.push('');
  }
  
  lines.push('---');
  lines.push('⚕️ Analyse générée à titre indicatif. Ne remplace pas le jugement clinique.');
  
  return lines.join('\n');
}

export function formatLLMResponse(query: LLMQuery): string {
  const lines: string[] = [];
  
  lines.push(`=== RÉPONSE ${MODEL_LABELS[query.model].toUpperCase()} ===`);
  lines.push('');
  lines.push(`Date: ${format(new Date(query.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}`);
  lines.push('');
  lines.push('QUESTION:');
  lines.push(query.query);
  lines.push('');
  lines.push('RÉPONSE:');
  lines.push(query.response);
  
  if (query.sources.length > 0) {
    lines.push('');
    lines.push('SOURCES:');
    query.sources.forEach((source, idx) => {
      lines.push(`  ${idx + 1}. ${source}`);
    });
  }
  
  return lines.join('\n');
}

export function formatMedicalNote(note: MedicalNote): string {
  const lines: string[] = [];
  
  lines.push('=== NOTE MÉDICALE ===');
  lines.push('');
  lines.push(`Patient: ${note.patient_name}`);
  lines.push(`Date: ${format(new Date(note.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}`);
  
  if (note.updated_at !== note.created_at) {
    lines.push(`Modifié le: ${format(new Date(note.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}`);
  }
  
  lines.push('');
  lines.push('CONTENU:');
  lines.push(note.content);
  
  return lines.join('\n');
}

export function formatMedicalReference(ref: MedicalReference): string {
  const lines: string[] = [];
  
  lines.push(`=== ${SOURCE_LABELS[ref.source]} ===`);
  lines.push('');
  lines.push(`Titre: ${ref.title}`);
  lines.push(`Description: ${ref.description}`);
  lines.push(`URL: ${ref.url}`);
  
  return lines.join('\n');
}

export function formatAllNotes(notes: MedicalNote[]): string {
  if (notes.length === 0) {
    return 'Aucune note enregistrée.';
  }
  
  const lines: string[] = [];
  lines.push('=== HISTORIQUE DES NOTES MÉDICALES ===');
  lines.push(`Total: ${notes.length} note(s)`);
  lines.push('');
  
  notes.forEach((note, idx) => {
    if (idx > 0) lines.push('---');
    lines.push(formatMedicalNote(note));
  });
  
  return lines.join('\n');
}
