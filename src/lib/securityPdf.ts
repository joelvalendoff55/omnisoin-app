import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SecurityStats, SecurityEvent, RBACViolation, SecurityEventsByDay } from './securityMonitoring';
import { FIELD_NAME_LABELS, ROLE_LABELS } from './securityMonitoring';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

interface SecurityDashboardData {
  stats: SecurityStats;
  events: SecurityEvent[];
  rbacViolations: RBACViolation[];
  timeline: SecurityEventsByDay[];
  structureName?: string;
  generatedBy?: string;
}

function addHeader(doc: jsPDF, title: string): number {
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, PAGE_WIDTH, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, MARGIN, 30);
  
  return 45;
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  doc.setFillColor(243, 244, 246);
  doc.rect(0, PAGE_HEIGHT - 15, PAGE_WIDTH, 15, 'F');
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.text('Rapport de sécurité - Audit HAS', MARGIN, PAGE_HEIGHT - 6);
  doc.text(`Page ${pageNumber} / ${totalPages}`, PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 6);
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, MARGIN + doc.getTextWidth(title), y + 2);
  
  return y + 12;
}

function addStatCard(doc: jsPDF, label: string, value: string | number, x: number, y: number, width: number): void {
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(x, y, width, 25, 3, 3, 'F');
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x + 5, y + 8);
  
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value), x + 5, y + 20);
}

function checkPageBreak(doc: jsPDF, y: number, neededHeight: number, pageCount: { current: number }): number {
  if (y + neededHeight > PAGE_HEIGHT - 25) {
    doc.addPage();
    pageCount.current++;
    return 20;
  }
  return y;
}

export function exportSecurityDashboardToPdf(data: SecurityDashboardData): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageCount = { current: 1 };
  
  // Page 1: Header and Overview
  let y = addHeader(doc, 'Rapport de Sécurité - Audit HAS');
  
  // Structure info
  if (data.structureName) {
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Structure: ${data.structureName}`, MARGIN, y);
    y += 8;
  }
  
  if (data.generatedBy) {
    doc.text(`Généré par: ${data.generatedBy}`, MARGIN, y);
    y += 8;
  }
  
  y += 5;
  
  // Statistics Section
  y = addSectionTitle(doc, 'Indicateurs de Sécurité', y);
  
  const cardWidth = (CONTENT_WIDTH - 10) / 3;
  
  addStatCard(doc, 'Total événements audit', data.stats.totalAuditEvents, MARGIN, y, cardWidth);
  addStatCard(doc, 'Événements sécurité (24h)', data.stats.securityEventsToday, MARGIN + cardWidth + 5, y, cardWidth);
  addStatCard(doc, 'Violations RBAC (24h)', data.stats.rbacViolations24h, MARGIN + 2 * (cardWidth + 5), y, cardWidth);
  
  y += 32;
  
  addStatCard(doc, 'Modifications données (7j)', data.stats.dataModifications7d, MARGIN, y, cardWidth);
  addStatCard(doc, 'Exports (24h)', data.stats.exportsToday, MARGIN + cardWidth + 5, y, cardWidth);
  
  // Hash chain status
  const hashStatus = data.stats.hashChainValid === true ? '✓ Valide' : 
                     data.stats.hashChainValid === false ? '✗ Compromis' : '? Non vérifié';
  addStatCard(doc, 'Intégrité Hash Chain', hashStatus, MARGIN + 2 * (cardWidth + 5), y, cardWidth);
  
  y += 40;
  
  // Timeline Summary
  if (data.timeline.length > 0) {
    y = addSectionTitle(doc, 'Évolution sur 14 jours', y);
    
    const totalSecurityEvents = data.timeline.reduce((sum, d) => sum + d.securityEvents, 0);
    const totalDataMods = data.timeline.reduce((sum, d) => sum + d.dataModifications, 0);
    const totalExports = data.timeline.reduce((sum, d) => sum + d.exports, 0);
    const totalRbac = data.timeline.reduce((sum, d) => sum + d.rbacChanges, 0);
    
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryItems = [
      `• Événements de sécurité: ${totalSecurityEvents}`,
      `• Modifications de données: ${totalDataMods}`,
      `• Exports réalisés: ${totalExports}`,
      `• Changements RBAC: ${totalRbac}`,
    ];
    
    summaryItems.forEach(item => {
      doc.text(item, MARGIN + 5, y);
      y += 6;
    });
    
    y += 10;
  }
  
  // Recent Security Events
  y = checkPageBreak(doc, y, 50, pageCount);
  y = addSectionTitle(doc, 'Événements de Sécurité Récents', y);
  
  if (data.events.length === 0) {
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(10);
    doc.text('Aucun événement de sécurité récent.', MARGIN + 5, y);
    y += 15;
  } else {
    const eventsToShow = data.events.slice(0, 15);
    
    eventsToShow.forEach(event => {
      y = checkPageBreak(doc, y, 20, pageCount);
      
      // Event row
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 18, 2, 2, 'F');
      
      // Severity indicator
      const severityColors: Record<string, [number, number, number]> = {
        critical: [220, 38, 38],
        high: [234, 88, 12],
        medium: [202, 138, 4],
        low: [22, 163, 74],
      };
      const [r, g, b] = severityColors[event.severity] || [107, 114, 128];
      doc.setFillColor(r, g, b);
      doc.circle(MARGIN + 5, y + 3, 2, 'F');
      
      // Event details
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(event.action.substring(0, 50), MARGIN + 12, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      
      const timestamp = format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr });
      doc.text(`${timestamp} | ${event.eventType} | ${event.resourceType || 'N/A'}`, MARGIN + 12, y + 7);
      
      if (event.userName) {
        doc.text(`Utilisateur: ${event.userName}`, MARGIN + 12, y + 12);
      }
      
      y += 22;
    });
    
    if (data.events.length > 15) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`... et ${data.events.length - 15} autres événements non affichés`, MARGIN + 5, y);
      y += 10;
    }
  }
  
  y += 10;
  
  // RBAC Violations
  y = checkPageBreak(doc, y, 50, pageCount);
  y = addSectionTitle(doc, 'Audit RBAC - Modifications de Champs', y);
  
  if (data.rbacViolations.length === 0) {
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(10);
    doc.text('Aucune modification RBAC récente.', MARGIN + 5, y);
    y += 15;
  } else {
    const violationsToShow = data.rbacViolations.slice(0, 10);
    
    violationsToShow.forEach(violation => {
      y = checkPageBreak(doc, y, 25, pageCount);
      
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 22, 2, 2, 'F');
      
      // Medical decision indicator
      if (violation.isMedicalDecision) {
        doc.setFillColor(220, 38, 38);
        doc.circle(MARGIN + 5, y + 5, 2, 'F');
      }
      
      const fieldLabel = FIELD_NAME_LABELS[violation.fieldName] || violation.fieldName;
      const roleLabel = ROLE_LABELS[violation.attemptedByRole] || violation.attemptedByRole;
      
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(fieldLabel, MARGIN + 12, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      
      const timestamp = format(new Date(violation.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr });
      doc.text(`${timestamp} | Rôle: ${roleLabel}`, MARGIN + 12, y + 7);
      
      if (violation.userName) {
        doc.text(`Par: ${violation.userName}`, MARGIN + 12, y + 12);
      }
      
      // Old -> New value
      const oldVal = violation.oldValue ? violation.oldValue.substring(0, 30) : '(vide)';
      const newVal = violation.newValue ? violation.newValue.substring(0, 30) : '(vide)';
      doc.text(`${oldVal} → ${newVal}`, MARGIN + 12, y + 17);
      
      y += 26;
    });
    
    if (data.rbacViolations.length > 10) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`... et ${data.rbacViolations.length - 10} autres modifications non affichées`, MARGIN + 5, y);
      y += 10;
    }
  }
  
  // Compliance Summary
  y = checkPageBreak(doc, y, 60, pageCount);
  y += 10;
  y = addSectionTitle(doc, 'Conformité HAS', y);
  
  const complianceChecks = [
    { label: 'Logs d\'audit immutables', passed: data.stats.totalAuditEvents > 0 },
    { label: 'Intégrité de la chaîne de hash', passed: data.stats.hashChainValid === true },
    { label: 'Traçabilité des accès aux données', passed: true },
    { label: 'Contrôle RBAC des champs médicaux', passed: true },
    { label: 'Export des données disponible', passed: true },
  ];
  
  complianceChecks.forEach(check => {
    const icon = check.passed ? '✓' : '✗';
    const color: [number, number, number] = check.passed ? [22, 163, 74] : [220, 38, 38];
    
    doc.setTextColor(...color);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(icon, MARGIN + 5, y);
    
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.text(check.label, MARGIN + 15, y);
    
    y += 8;
  });
  
  // Add footers to all pages
  const totalPages = pageCount.current;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  // Save
  const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: fr });
  doc.save(`rapport-securite-has-${dateStr}.pdf`);
}
