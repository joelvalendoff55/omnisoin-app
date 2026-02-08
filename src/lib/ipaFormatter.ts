import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Complex case types
export interface ComplexCase {
  id: string;
  patient_name: string;
  patient_dob?: string;
  complexity_level: 1 | 2 | 3;
  pathologies: string[];
  status: 'actif' | 'stable' | 'en_amelioration' | 'cloture';
  last_intervention?: string;
  next_rdv?: string;
  notes?: string;
  interventions: CaseIntervention[];
}

export interface CaseIntervention {
  id: string;
  date: string;
  type: 'consultation' | 'visite' | 'coordination' | 'education';
  summary: string;
  practitioner_name?: string;
}

const COMPLEXITY_LABELS = {
  1: 'Niveau 1 - Modéré',
  2: 'Niveau 2 - Élevé',
  3: 'Niveau 3 - Très élevé',
};

const STATUS_LABELS = {
  actif: 'Actif',
  stable: 'Stable',
  en_amelioration: 'En amélioration',
  cloture: 'Clôturé',
};

const INTERVENTION_TYPE_LABELS = {
  consultation: 'Consultation',
  visite: 'Visite à domicile',
  coordination: 'Coordination',
  education: 'Éducation thérapeutique',
};

export function formatComplexCase(caseData: ComplexCase): string {
  const lines: string[] = [];
  
  lines.push('=== SYNTHÈSE CAS COMPLEXE ===');
  lines.push(`Patient: ${caseData.patient_name}`);
  
  if (caseData.patient_dob) {
    lines.push(`Date de naissance: ${format(new Date(caseData.patient_dob), 'dd/MM/yyyy', { locale: fr })}`);
  }
  
  lines.push(`Niveau de complexité: ${COMPLEXITY_LABELS[caseData.complexity_level]}`);
  lines.push(`Statut: ${STATUS_LABELS[caseData.status]}`);
  
  if (caseData.pathologies.length > 0) {
    lines.push(`Pathologies: ${caseData.pathologies.join(', ')}`);
  }
  
  if (caseData.last_intervention) {
    lines.push(`Dernière intervention: ${format(new Date(caseData.last_intervention), 'dd/MM/yyyy', { locale: fr })}`);
  }
  
  if (caseData.next_rdv) {
    lines.push(`Prochain RDV: ${format(new Date(caseData.next_rdv), 'dd/MM/yyyy', { locale: fr })}`);
  }
  
  if (caseData.notes) {
    lines.push(`Notes: ${caseData.notes}`);
  }
  
  if (caseData.interventions.length > 0) {
    lines.push('');
    lines.push('--- Historique des interventions ---');
    for (const intervention of caseData.interventions.slice(0, 5)) {
      const date = format(new Date(intervention.date), 'dd/MM/yyyy', { locale: fr });
      lines.push(`${date} - ${INTERVENTION_TYPE_LABELS[intervention.type]}: ${intervention.summary}`);
    }
  }
  
  return lines.join('\n');
}

export function formatAllComplexCases(cases: ComplexCase[]): string {
  const lines: string[] = [];
  
  lines.push('╔════════════════════════════════════════════════════════════╗');
  lines.push('║           LISTE DES CAS COMPLEXES IPA                      ║');
  lines.push(`║           Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}                   ║`);
  lines.push('╚════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  lines.push(`Total: ${cases.length} cas suivis`);
  lines.push(`  - Niveau 3: ${cases.filter(c => c.complexity_level === 3).length}`);
  lines.push(`  - Niveau 2: ${cases.filter(c => c.complexity_level === 2).length}`);
  lines.push(`  - Niveau 1: ${cases.filter(c => c.complexity_level === 1).length}`);
  lines.push('');
  
  for (const caseData of cases) {
    lines.push(formatComplexCase(caseData));
    lines.push('');
  }
  
  return lines.join('\n');
}

// Medical templates
export interface MedicalTemplate {
  id: string;
  title: string;
  category: 'courrier' | 'compte_rendu' | 'ordonnance' | 'certificat';
  content: string;
}

export function formatMedicalDocument(template: MedicalTemplate, variables?: Record<string, string>): string {
  let content = template.content;
  
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  }
  
  return content;
}

// CPTS types
export interface CPTSProfessional {
  id: string;
  name: string;
  profession: string;
  specialty?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CPTSMeeting {
  id: string;
  title: string;
  date: string;
  location?: string;
  attendees_count?: number;
}

export function formatCPTSDirectory(professionals: CPTSProfessional[]): string {
  const lines: string[] = [];
  
  lines.push('=== ANNUAIRE CPTS ===');
  lines.push(`${professionals.length} professionnels de santé`);
  lines.push('');
  
  // Group by profession
  const grouped = professionals.reduce((acc, p) => {
    if (!acc[p.profession]) acc[p.profession] = [];
    acc[p.profession].push(p);
    return acc;
  }, {} as Record<string, CPTSProfessional[]>);
  
  for (const [profession, profs] of Object.entries(grouped)) {
    lines.push(`--- ${profession} ---`);
    for (const p of profs) {
      lines.push(`• ${p.name}${p.specialty ? ` (${p.specialty})` : ''}`);
      if (p.phone) lines.push(`  Tél: ${p.phone}`);
      if (p.email) lines.push(`  Email: ${p.email}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

// Cooperation protocols
export interface CooperationProtocol {
  id: string;
  title: string;
  delegating_doctor: string;
  status: 'actif' | 'en_revision' | 'suspendu';
  start_date: string;
  end_date?: string;
  delegated_acts: string[];
  acts_performed: number;
}

export function formatProtocols(protocols: CooperationProtocol[]): string {
  const lines: string[] = [];
  
  lines.push('=== PROTOCOLES DE COOPÉRATION ===');
  lines.push(`${protocols.length} protocole(s) actif(s)`);
  lines.push('');
  
  for (const p of protocols) {
    lines.push(`• ${p.title}`);
    lines.push(`  Médecin délégant: ${p.delegating_doctor}`);
    lines.push(`  Statut: ${p.status === 'actif' ? 'Actif' : p.status === 'en_revision' ? 'En révision' : 'Suspendu'}`);
    lines.push(`  Période: ${format(new Date(p.start_date), 'dd/MM/yyyy', { locale: fr })}${p.end_date ? ` - ${format(new Date(p.end_date), 'dd/MM/yyyy', { locale: fr })}` : ' - En cours'}`);
    lines.push(`  Actes délégués: ${p.delegated_acts.join(', ')}`);
    lines.push(`  Actes réalisés: ${p.acts_performed}`);
    lines.push('');
  }
  
  return lines.join('\n');
}
