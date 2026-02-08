import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ACIIndicator } from '@/hooks/useACIIndicators';

const CATEGORY_LABELS = {
  acces_soins: 'Accès aux soins',
  travail_equipe: 'Travail en équipe',
  systeme_info: "Système d'information",
};

const STATUS_LABELS = {
  on_track: 'En bonne voie',
  at_risk: 'Attention',
  late: 'En retard',
};

export function formatACIReport(indicators: ACIIndicator[], structureName?: string): string {
  const lines: string[] = [];
  
  // Header
  lines.push('╔════════════════════════════════════════════════════════════╗');
  lines.push('║           RAPPORT INDICATEURS ACI / ROSP                   ║');
  lines.push(`║           Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}                   ║`);
  lines.push('╚════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  if (structureName) {
    lines.push(`Structure: ${structureName}`);
    lines.push('');
  }
  
  // Summary
  const onTrack = indicators.filter(i => i.status === 'on_track').length;
  const atRisk = indicators.filter(i => i.status === 'at_risk').length;
  const late = indicators.filter(i => i.status === 'late').length;
  const totalProgress = indicators.length > 0 
    ? Math.round(indicators.reduce((acc, i) => acc + (i.current_value / i.target_value) * 100, 0) / indicators.length)
    : 0;
  
  lines.push('=== SYNTHÈSE ===');
  lines.push(`Nombre total d'indicateurs: ${indicators.length}`);
  lines.push(`Progression globale: ${totalProgress}%`);
  lines.push(`  ✓ En bonne voie: ${onTrack}`);
  lines.push(`  ⚠ Attention: ${atRisk}`);
  lines.push(`  ✗ En retard: ${late}`);
  lines.push('');
  
  // Group by category
  const categories = ['acces_soins', 'travail_equipe', 'systeme_info'] as const;
  
  for (const category of categories) {
    const categoryIndicators = indicators.filter(i => i.category === category);
    if (categoryIndicators.length === 0) continue;
    
    lines.push(`=== ${CATEGORY_LABELS[category].toUpperCase()} ===`);
    
    for (const indicator of categoryIndicators) {
      const progress = Math.round((indicator.current_value / indicator.target_value) * 100);
      const statusEmoji = indicator.status === 'on_track' ? '✓' : indicator.status === 'at_risk' ? '⚠' : '✗';
      
      lines.push(`${statusEmoji} ${indicator.name}`);
      lines.push(`   Valeur: ${indicator.current_value}/${indicator.target_value} ${indicator.unit} (${progress}%)`);
      lines.push(`   Statut: ${STATUS_LABELS[indicator.status]}`);
      
      if (indicator.description) {
        lines.push(`   Description: ${indicator.description}`);
      }
      lines.push('');
    }
  }
  
  // Alerts section
  const alerts = indicators.filter(i => i.status === 'late' || i.status === 'at_risk');
  if (alerts.length > 0) {
    lines.push('=== ALERTES À TRAITER ===');
    for (const alert of alerts) {
      const progress = Math.round((alert.current_value / alert.target_value) * 100);
      lines.push(`• ${alert.name} - ${progress}% (${STATUS_LABELS[alert.status]})`);
    }
    lines.push('');
  }
  
  // Footer
  lines.push('════════════════════════════════════════════════════════════');
  lines.push('Fin du rapport ACI');
  
  return lines.join('\n');
}

export interface CPAMDossier {
  id: string;
  title: string;
  dossier_type: 'demande_ald' | 'reclamation' | 'accord_prealable' | 'autre';
  status: 'en_attente' | 'en_cours' | 'valide' | 'rejete';
  organisme: 'cpam' | 'ars' | 'autre';
  patient_name?: string;
  date_depot?: string;
  date_reponse?: string;
  notes?: string;
}

const DOSSIER_TYPE_LABELS = {
  demande_ald: 'Demande ALD',
  reclamation: 'Réclamation',
  accord_prealable: 'Accord préalable',
  autre: 'Autre',
};

const DOSSIER_STATUS_LABELS = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  valide: 'Validé',
  rejete: 'Rejeté',
};

export function formatCPAMDossiers(dossiers: CPAMDossier[]): string {
  if (dossiers.length === 0) {
    return '=== DOSSIERS CPAM/ARS ===\nAucun dossier en cours';
  }
  
  const lines: string[] = ['=== DOSSIERS CPAM/ARS ==='];
  lines.push(`Total: ${dossiers.length} dossier(s)`);
  lines.push('');
  
  for (const d of dossiers) {
    lines.push(`• ${d.title}`);
    lines.push(`  Type: ${DOSSIER_TYPE_LABELS[d.dossier_type]} | Organisme: ${d.organisme.toUpperCase()}`);
    lines.push(`  Statut: ${DOSSIER_STATUS_LABELS[d.status]}`);
    
    if (d.patient_name) {
      lines.push(`  Patient: ${d.patient_name}`);
    }
    
    if (d.date_depot) {
      lines.push(`  Date dépôt: ${format(new Date(d.date_depot), 'dd/MM/yyyy', { locale: fr })}`);
    }
    
    if (d.date_reponse) {
      lines.push(`  Date réponse: ${format(new Date(d.date_reponse), 'dd/MM/yyyy', { locale: fr })}`);
    }
    
    if (d.notes) {
      lines.push(`  Notes: ${d.notes}`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

export interface TeamAbsence {
  id: string;
  user_name: string;
  absence_type: 'conge' | 'maladie' | 'formation' | 'autre';
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
}

const ABSENCE_TYPE_LABELS = {
  conge: 'Congés',
  maladie: 'Maladie',
  formation: 'Formation',
  autre: 'Autre',
};

export function formatTeamAbsences(absences: TeamAbsence[]): string {
  if (absences.length === 0) {
    return '=== ABSENCES ÉQUIPE ===\nAucune absence programmée';
  }
  
  const lines: string[] = ['=== ABSENCES ÉQUIPE ==='];
  
  for (const a of absences) {
    const startDate = format(new Date(a.start_date), 'dd/MM/yyyy', { locale: fr });
    const endDate = format(new Date(a.end_date), 'dd/MM/yyyy', { locale: fr });
    lines.push(`• ${a.user_name}: ${startDate} - ${endDate} (${ABSENCE_TYPE_LABELS[a.absence_type]})`);
  }
  
  return lines.join('\n');
}

export interface TeamMeeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: 'equipe' | 'rcp' | 'formation' | 'autre';
  location?: string;
  attendees_count?: number;
}

const MEETING_TYPE_LABELS = {
  equipe: 'Réunion équipe',
  rcp: 'RCP',
  formation: 'Formation',
  autre: 'Autre',
};

export function formatTeamMeetings(meetings: TeamMeeting[]): string {
  if (meetings.length === 0) {
    return '=== RÉUNIONS ÉQUIPE ===\nAucune réunion programmée';
  }
  
  const lines: string[] = ['=== RÉUNIONS ÉQUIPE ==='];
  
  for (const m of meetings) {
    const meetingDate = format(new Date(m.meeting_date), 'dd/MM/yyyy à HH:mm', { locale: fr });
    lines.push(`• ${m.title} - ${meetingDate}`);
    lines.push(`  Type: ${MEETING_TYPE_LABELS[m.meeting_type]}`);
    
    if (m.location) {
      lines.push(`  Lieu: ${m.location}`);
    }
    
    if (m.attendees_count) {
      lines.push(`  Participants: ${m.attendees_count}`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

// Format monthly report
export interface MonthlyReportData {
  month: string;
  indicators: ACIIndicator[];
  dossiers: CPAMDossier[];
  absences: TeamAbsence[];
  meetings: TeamMeeting[];
  structureName?: string;
}

export function formatMonthlyReport(data: MonthlyReportData): string {
  const lines: string[] = [];
  
  // Header
  lines.push('╔════════════════════════════════════════════════════════════╗');
  lines.push(`║           RAPPORT MENSUEL - ${data.month.toUpperCase()}                        ║`);
  lines.push(`║           Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}                   ║`);
  lines.push('╚════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  if (data.structureName) {
    lines.push(`Structure: ${data.structureName}`);
    lines.push('');
  }
  
  // ACI Summary
  lines.push(formatACIReport(data.indicators));
  lines.push('');
  
  // CPAM Dossiers
  lines.push(formatCPAMDossiers(data.dossiers));
  lines.push('');
  
  // Absences
  lines.push(formatTeamAbsences(data.absences));
  lines.push('');
  
  // Meetings
  lines.push(formatTeamMeetings(data.meetings));
  
  // Footer
  lines.push('');
  lines.push('════════════════════════════════════════════════════════════');
  lines.push('Fin du rapport mensuel');
  
  return lines.join('\n');
}
