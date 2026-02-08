import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Antecedent, SEVERITY_LABELS } from './antecedents';
import { DrugInteractionResult, DrugInteraction } from '@/hooks/useDrugInteractions';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

interface PatientInfo {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nir?: string;
}

interface StructureInfo {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

interface TreatmentsPdfData {
  patient: PatientInfo;
  structure: StructureInfo;
  treatments: Antecedent[];
  allergies: Antecedent[];
  interactionResult: DrugInteractionResult | null;
  generatedBy?: string;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function addHeader(doc: jsPDF, structureInfo: StructureInfo): number {
  // Blue header bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, PAGE_WIDTH, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT DES TRAITEMENTS', MARGIN, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(structureInfo.name, MARGIN, 28);
  
  // Right side - generation date
  doc.setFontSize(9);
  const dateText = `Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, PAGE_WIDTH - MARGIN - dateWidth, 28);
  
  return 45;
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  doc.setFillColor(243, 244, 246);
  doc.rect(0, PAGE_HEIGHT - 20, PAGE_WIDTH, 20, 'F');
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Ce document est un support d\'information inter-praticiens. L\'analyse d\'interactions est générée par IA à titre indicatif uniquement. Toute décision thérapeutique relève du praticien.',
    MARGIN,
    PAGE_HEIGHT - 12
  );
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Rapport de traitements - OmniSoin', MARGIN, PAGE_HEIGHT - 6);
  doc.text(`Page ${pageNumber} / ${totalPages}`, PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 6);
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, MARGIN + doc.getTextWidth(title), y + 2);
  
  return y + 10;
}

function checkPageBreak(doc: jsPDF, y: number, neededHeight: number, pageCount: { current: number }): number {
  if (y + neededHeight > PAGE_HEIGHT - 30) {
    doc.addPage();
    pageCount.current++;
    return 20;
  }
  return y;
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): [number, number, number] {
  switch (severity) {
    case 'high': return [220, 38, 38]; // red-600
    case 'medium': return [234, 88, 12]; // orange-600
    case 'low': return [202, 138, 4]; // yellow-600
    default: return [107, 114, 128]; // gray-500
  }
}

function getSeverityLabel(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high': return 'MAJEURE';
    case 'medium': return 'MODÉRÉE';
    case 'low': return 'MINEURE';
    default: return 'INCONNUE';
  }
}

function getSeverityBgColor(severity: 'high' | 'medium' | 'low'): [number, number, number] {
  switch (severity) {
    case 'high': return [254, 226, 226]; // red-100
    case 'medium': return [255, 237, 213]; // orange-100
    case 'low': return [254, 249, 195]; // yellow-100
    default: return [243, 244, 246]; // gray-100
  }
}

export async function generateTreatmentsPdf(data: TreatmentsPdfData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageCount = { current: 1 };
  let yPos = addHeader(doc, data.structure);

  // Patient Info Section
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 28, 3, 3, 'F');
  
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.patient.lastName.toUpperCase()} ${data.patient.firstName}`, MARGIN + 5, yPos + 10);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  
  const patientDetails: string[] = [];
  if (data.patient.dateOfBirth) {
    patientDetails.push(`Né(e) le ${format(new Date(data.patient.dateOfBirth), 'dd/MM/yyyy')}`);
  }
  if (data.patient.nir) {
    patientDetails.push(`NIR: ${data.patient.nir}`);
  }
  if (patientDetails.length > 0) {
    doc.text(patientDetails.join(' — '), MARGIN + 5, yPos + 18);
  }

  // Treatments count badge
  const activeTreatments = data.treatments.filter(t => t.actif);
  const treatmentCountText = `${activeTreatments.length} traitement${activeTreatments.length > 1 ? 's' : ''} actif${activeTreatments.length > 1 ? 's' : ''}`;
  doc.setFillColor(34, 197, 94); // green-500
  doc.roundedRect(PAGE_WIDTH - MARGIN - 45, yPos + 4, 40, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const countWidth = doc.getTextWidth(treatmentCountText);
  doc.text(treatmentCountText, PAGE_WIDTH - MARGIN - 45 + (40 - countWidth) / 2, yPos + 9.5);
  
  yPos += 35;

  // Allergies Alert
  if (data.allergies.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, pageCount);
    
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 16, 3, 3, 'F');
    
    doc.setDrawColor(248, 113, 113); // red-400
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 16, 3, 3, 'S');
    
    doc.setTextColor(185, 28, 28); // red-700
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ ALLERGIES:', MARGIN + 5, yPos + 7);
    
    doc.setFont('helvetica', 'normal');
    const allergiesText = data.allergies.map(a => a.description).join(', ');
    const wrappedAllergies = doc.splitTextToSize(allergiesText, CONTENT_WIDTH - 45);
    doc.text(wrappedAllergies[0], MARGIN + 35, yPos + 7);
    if (wrappedAllergies.length > 1) {
      doc.text(wrappedAllergies.slice(1).join(' '), MARGIN + 5, yPos + 12);
    }
    
    yPos += 22;
  }

  // Interaction Analysis Summary
  if (data.interactionResult) {
    const highCount = data.interactionResult.interactions.filter(i => i.severity === 'high').length;
    const mediumCount = data.interactionResult.interactions.filter(i => i.severity === 'medium').length;
    const lowCount = data.interactionResult.interactions.filter(i => i.severity === 'low').length;
    const totalInteractions = data.interactionResult.interactions.length;
    const hasInteractions = totalInteractions > 0;
    
    yPos = checkPageBreak(doc, yPos, 25, pageCount);
    yPos = addSectionTitle(doc, 'Analyse des interactions médicamenteuses', yPos);
    
    // Analysis summary box
    if (hasInteractions) {
      doc.setFillColor(highCount > 0 ? 254 : 255, highCount > 0 ? 226 : 237, highCount > 0 ? 226 : 213);
    } else {
      doc.setFillColor(220, 252, 231); // green-100
    }
    doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 18, 3, 3, 'F');
    
    if (!hasInteractions) {
      doc.setTextColor(22, 101, 52); // green-800
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ Aucune interaction médicamenteuse détectée', MARGIN + 5, yPos + 11);
    } else {
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalInteractions} interaction${totalInteractions > 1 ? 's' : ''} détectée${totalInteractions > 1 ? 's' : ''}:`, MARGIN + 5, yPos + 7);
      
      let badgeX = MARGIN + 5;
      doc.setFontSize(8);
      
      if (highCount > 0) {
        doc.setFillColor(...getSeverityColor('high'));
        doc.roundedRect(badgeX, yPos + 10, 25, 6, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${highCount} majeure${highCount > 1 ? 's' : ''}`, badgeX + 2, yPos + 14);
        badgeX += 28;
      }
      if (mediumCount > 0) {
        doc.setFillColor(...getSeverityColor('medium'));
        doc.roundedRect(badgeX, yPos + 10, 25, 6, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${mediumCount} modérée${mediumCount > 1 ? 's' : ''}`, badgeX + 2, yPos + 14);
        badgeX += 28;
      }
      if (lowCount > 0) {
        doc.setFillColor(...getSeverityColor('low'));
        doc.roundedRect(badgeX, yPos + 10, 25, 6, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${lowCount} mineure${lowCount > 1 ? 's' : ''}`, badgeX + 2, yPos + 14);
      }
    }
    
    yPos += 22;

    // Detailed interactions
    if (hasInteractions) {
      const sortedInteractions = [...data.interactionResult.interactions].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      });

      for (const interaction of sortedInteractions) {
        const descLines = doc.splitTextToSize(interaction.description, CONTENT_WIDTH - 35);
        const cardHeight = 10 + descLines.length * 4;
        
        yPos = checkPageBreak(doc, yPos, cardHeight + 5, pageCount);
        
        // Interaction card
        doc.setFillColor(...getSeverityBgColor(interaction.severity));
        doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, cardHeight, 2, 2, 'F');
        
        // Severity indicator bar
        doc.setFillColor(...getSeverityColor(interaction.severity));
        doc.rect(MARGIN, yPos, 3, cardHeight, 'F');
        
        // Severity badge
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        const severityLabel = getSeverityLabel(interaction.severity);
        const labelWidth = doc.getTextWidth(severityLabel) + 4;
        doc.setFillColor(...getSeverityColor(interaction.severity));
        doc.roundedRect(MARGIN + 5, yPos + 2, labelWidth, 5, 1, 1, 'F');
        doc.text(severityLabel, MARGIN + 7, yPos + 5.5);
        
        // Medications involved
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        const medsText = interaction.medications.join(' + ');
        doc.text(medsText, MARGIN + 5 + labelWidth + 3, yPos + 6);
        
        // Description
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text(descLines, MARGIN + 5, yPos + 12);
        
        yPos += cardHeight + 3;
      }
    }

    // Contraindications
    if (data.interactionResult.contraindications.length > 0) {
      yPos = checkPageBreak(doc, yPos, 20, pageCount);
      yPos += 5;
      
      doc.setFillColor(254, 226, 226); // red-100
      const ciHeight = 10 + data.interactionResult.contraindications.length * 5;
      doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, ciHeight, 2, 2, 'F');
      
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Contre-indications:', MARGIN + 5, yPos + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      data.interactionResult.contraindications.forEach((ci, idx) => {
        doc.text(`• ${ci}`, MARGIN + 8, yPos + 12 + idx * 5);
      });
      
      yPos += ciHeight + 5;
    }

    // Warnings
    if (data.interactionResult.warnings.length > 0) {
      yPos = checkPageBreak(doc, yPos, 20, pageCount);
      
      doc.setFillColor(255, 237, 213); // orange-100
      const warnHeight = 10 + data.interactionResult.warnings.length * 5;
      doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, warnHeight, 2, 2, 'F');
      
      doc.setTextColor(154, 52, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Points de vigilance:', MARGIN + 5, yPos + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      data.interactionResult.warnings.forEach((warn, idx) => {
        doc.text(`• ${warn}`, MARGIN + 8, yPos + 12 + idx * 5);
      });
      
      yPos += warnHeight + 5;
    }

    // Analysis timestamp
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Analyse IA effectuée le ${format(data.interactionResult.analyzedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      MARGIN,
      yPos + 3
    );
    yPos += 10;
  }

  // Active Treatments List
  yPos = checkPageBreak(doc, yPos, 30, pageCount);
  yPos = addSectionTitle(doc, 'Traitements en cours', yPos);

  if (activeTreatments.length > 0) {
    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Médicament / Traitement', MARGIN + 3, yPos + 5.5);
    doc.text('Posologie / Notes', MARGIN + 90, yPos + 5.5);
    doc.text('Depuis', PAGE_WIDTH - MARGIN - 22, yPos + 5.5);
    yPos += 10;

    // Treatment rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    activeTreatments.forEach((treatment, idx) => {
      yPos = checkPageBreak(doc, yPos, 12, pageCount);
      
      // Alternate row background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN, yPos - 3, CONTENT_WIDTH, 10, 'F');
      }
      
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      const descText = doc.splitTextToSize(treatment.description, 80);
      doc.text(descText[0], MARGIN + 3, yPos + 3);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      if (treatment.notes) {
        const notesText = doc.splitTextToSize(treatment.notes, 60);
        doc.text(notesText[0], MARGIN + 90, yPos + 3);
      }
      
      if (treatment.date_debut) {
        doc.text(format(new Date(treatment.date_debut), 'dd/MM/yy'), PAGE_WIDTH - MARGIN - 22, yPos + 3);
      }
      
      yPos += 10;
    });
  } else {
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Aucun traitement actif enregistré', MARGIN, yPos + 5);
    yPos += 12;
  }

  // Inactive treatments (if any)
  const inactiveTreatments = data.treatments.filter(t => !t.actif);
  if (inactiveTreatments.length > 0) {
    yPos = checkPageBreak(doc, yPos, 25, pageCount);
    yPos += 5;
    yPos = addSectionTitle(doc, 'Traitements arrêtés', yPos);

    doc.setFillColor(243, 244, 246);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text('Médicament / Traitement', MARGIN + 3, yPos + 5.5);
    doc.text('Date d\'arrêt', PAGE_WIDTH - MARGIN - 25, yPos + 5.5);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);

    inactiveTreatments.slice(0, 10).forEach((treatment, idx) => {
      yPos = checkPageBreak(doc, yPos, 8, pageCount);
      
      doc.text(treatment.description, MARGIN + 3, yPos + 3);
      if (treatment.date_fin) {
        doc.text(format(new Date(treatment.date_fin), 'dd/MM/yy'), PAGE_WIDTH - MARGIN - 25, yPos + 3);
      }
      
      yPos += 7;
    });

    if (inactiveTreatments.length > 10) {
      doc.text(`... et ${inactiveTreatments.length - 10} autre(s)`, MARGIN + 3, yPos + 3);
    }
  }

  // Structure contact info
  yPos = checkPageBreak(doc, yPos, 25, pageCount);
  yPos += 10;
  
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, yPos, PAGE_WIDTH - MARGIN, yPos);
  yPos += 8;
  
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.structure.name, MARGIN, yPos);
  if (data.structure.address) {
    doc.text(data.structure.address, MARGIN, yPos + 4);
  }
  if (data.structure.phone) {
    doc.text(`Tél: ${data.structure.phone}`, MARGIN, yPos + 8);
  }
  
  if (data.generatedBy) {
    doc.text(`Généré par: ${data.generatedBy}`, PAGE_WIDTH - MARGIN - 50, yPos);
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  // Generate filename and save
  const patientName = `${data.patient.lastName}_${data.patient.firstName}`.replace(/\s+/g, '_');
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `traitements_${patientName}_${dateStr}.pdf`;
  
  doc.save(filename);
}
