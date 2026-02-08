import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Patient } from '@/types/patient';
import { Antecedent, ANTECEDENT_TYPE_LABELS, SEVERITY_LABELS } from '@/lib/antecedents';
import { Consultation } from '@/lib/consultations';

// Helper to calculate age
function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getSexLabel(sex: string | null): string {
  switch (sex) {
    case 'M':
      return 'Masculin';
    case 'F':
      return 'Féminin';
    case 'O':
      return 'Autre';
    default:
      return 'Non renseigné';
  }
}

// Format patient identity
export function formatPatientIdentity(patient: Patient, practitionerName?: string): string {
  const lines: string[] = [];
  
  lines.push('=== PATIENT ===');
  lines.push(`Nom: ${patient.last_name.toUpperCase()} ${patient.first_name}`);
  
  if (patient.dob) {
    lines.push(`Date de naissance: ${format(new Date(patient.dob), 'dd/MM/yyyy', { locale: fr })} (${calculateAge(patient.dob)} ans)`);
  }
  
  lines.push(`Sexe: ${getSexLabel(patient.sex)}`);
  
  if (patient.phone) {
    lines.push(`Téléphone: ${patient.phone}`);
  }
  
  if (patient.email) {
    lines.push(`Email: ${patient.email}`);
  }
  
  if (practitionerName) {
    lines.push(`Praticien référent: ${practitionerName}`);
  }
  
  if (patient.note_admin) {
    lines.push(`Note administrative: ${patient.note_admin}`);
  }
  
  return lines.join('\n');
}

// Format antecedents by type
export function formatAntecedents(antecedents: Antecedent[]): string {
  if (antecedents.length === 0) {
    return '=== ANTÉCÉDENTS ===\nAucun antécédent enregistré';
  }

  const lines: string[] = ['=== ANTÉCÉDENTS ==='];
  
  // Group by type
  const grouped = antecedents.reduce((acc, ant) => {
    if (!acc[ant.type]) acc[ant.type] = [];
    acc[ant.type].push(ant);
    return acc;
  }, {} as Record<string, Antecedent[]>);
  
  // Format each group
  for (const [type, items] of Object.entries(grouped)) {
    lines.push('');
    lines.push(`--- ${ANTECEDENT_TYPE_LABELS[type as keyof typeof ANTECEDENT_TYPE_LABELS]} ---`);
    
    for (const ant of items) {
      let line = `• ${ant.description}`;
      
      if (ant.severity) {
        line += ` [${SEVERITY_LABELS[ant.severity]}]`;
      }
      
      if (!ant.actif) {
        line += ' (Inactif)';
      }
      
      lines.push(line);
      
      if (ant.date_debut) {
        lines.push(`  Depuis: ${format(new Date(ant.date_debut), 'dd/MM/yyyy', { locale: fr })}`);
      }
      
      if (ant.notes) {
        lines.push(`  Note: ${ant.notes}`);
      }
    }
  }
  
  return lines.join('\n');
}

// Format treatments only (subset of antecedents)
export function formatTreatments(antecedents: Antecedent[]): string {
  const treatments = antecedents.filter(a => a.type === 'traitement_en_cours' && a.actif);
  
  if (treatments.length === 0) {
    return '=== TRAITEMENTS EN COURS ===\nAucun traitement en cours';
  }
  
  const lines: string[] = ['=== TRAITEMENTS EN COURS ==='];
  
  for (const t of treatments) {
    let line = `• ${t.description}`;
    if (t.date_debut) {
      line += ` (depuis ${format(new Date(t.date_debut), 'dd/MM/yyyy', { locale: fr })})`;
    }
    lines.push(line);
    
    if (t.notes) {
      lines.push(`  Note: ${t.notes}`);
    }
  }
  
  return lines.join('\n');
}

// Format consultations
export function formatConsultations(consultations: Consultation[]): string {
  if (consultations.length === 0) {
    return '=== CONSULTATIONS ===\nAucune consultation enregistrée';
  }
  
  const lines: string[] = ['=== CONSULTATIONS ==='];
  
  // Take last 10 consultations
  const recent = consultations.slice(0, 10);
  
  for (const c of recent) {
    lines.push('');
    lines.push(`--- ${format(new Date(c.consultation_date), 'dd/MM/yyyy', { locale: fr })} ---`);
    
    const practitionerName = c.practitioner 
      ? `${c.practitioner.first_name || ''} ${c.practitioner.last_name || ''}`.trim() || 'Inconnu'
      : 'Inconnu';
    lines.push(`Praticien: ${practitionerName}`);
    
    if (c.motif) {
      lines.push(`Motif: ${c.motif}`);
    }
    
    if (c.examen_clinique) {
      lines.push(`Examen clinique: ${c.examen_clinique}`);
    }
    
    if (c.notes_cliniques) {
      lines.push(`Notes cliniques: ${c.notes_cliniques}`);
    }
    
    if (c.conclusion) {
      lines.push(`Conclusion: ${c.conclusion}`);
    }
  }
  
  if (consultations.length > 10) {
    lines.push('');
    lines.push(`... et ${consultations.length - 10} consultation(s) antérieure(s)`);
  }
  
  return lines.join('\n');
}
// Format everything for complete export
export interface OmnidocData {
  patient: Patient;
  practitionerName?: string;
  antecedents: Antecedent[];
  consultations: Consultation[];
}

export function formatAllForOmnidoc(data: OmnidocData): string {
  const sections: string[] = [];
  
  // Header
  sections.push('╔════════════════════════════════════════════════════════════╗');
  sections.push('║        DOSSIER MÉDICAL PATIENT - Export Omnidoc           ║');
  sections.push(`║        Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}                   ║`);
  sections.push('╚════════════════════════════════════════════════════════════╝');
  sections.push('');
  
  // Patient identity
  sections.push(formatPatientIdentity(data.patient, data.practitionerName));
  sections.push('');
  
  // Antecedents (excluding treatments)
  const antecedentsWithoutTreatments = data.antecedents.filter(a => a.type !== 'traitement_en_cours');
  if (antecedentsWithoutTreatments.length > 0) {
    sections.push(formatAntecedents(antecedentsWithoutTreatments));
    sections.push('');
  }
  
  // Current treatments
  sections.push(formatTreatments(data.antecedents));
  sections.push('');
  
  // Consultations
  sections.push(formatConsultations(data.consultations));
  
  // Footer
  sections.push('');
  sections.push('════════════════════════════════════════════════════════════');
  sections.push('Fin du dossier');
  
  return sections.join('\n');
}
