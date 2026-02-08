import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Prescription, Medication } from './prescriptions';

interface StructureInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  siret?: string | null;
}

interface PractitionerInfo {
  first_name: string | null;
  last_name: string | null;
  specialty?: string | null;
  rpps_number?: string | null;
  adeli_number?: string | null;
}

export interface PrescriptionPdfData {
  prescription: Prescription & {
    patient?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      dob: string | null;
    };
  };
  structure: StructureInfo;
  practitioner: PractitionerInfo;
  signatureUrl?: string | null;
}

// A5 dimensions in mm: 148 x 210
const PAGE_WIDTH = 148;
const PAGE_HEIGHT = 210;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

export async function generatePrescriptionPdf(data: PrescriptionPdfData): Promise<jsPDF> {
  const { prescription, structure, practitioner, signatureUrl } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  let y = MARGIN;

  // Header - Practitioner info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const practitionerName = `Dr ${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim();
  doc.text(practitionerName, MARGIN, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  if (practitioner.specialty) {
    doc.text(practitioner.specialty, MARGIN, y);
    y += 4;
  }

  if (practitioner.rpps_number) {
    doc.text(`RPPS: ${practitioner.rpps_number}`, MARGIN, y);
    y += 4;
  }

  if (practitioner.adeli_number) {
    doc.text(`ADELI: ${practitioner.adeli_number}`, MARGIN, y);
    y += 4;
  }

  // Structure info
  y += 2;
  doc.setFontSize(8);
  doc.text(structure.name, MARGIN, y);
  y += 3.5;

  if (structure.address) {
    doc.text(structure.address, MARGIN, y);
    y += 3.5;
  }

  if (structure.phone) {
    doc.text(`Tél: ${structure.phone}`, MARGIN, y);
    y += 3.5;
  }

  if (structure.email) {
    doc.text(structure.email, MARGIN, y);
    y += 3.5;
  }

  if (structure.siret) {
    doc.text(`SIRET: ${structure.siret}`, MARGIN, y);
    y += 3.5;
  }

  // Separator line
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // Date on the right
  const dateStr = format(new Date(prescription.created_at), 'dd MMMM yyyy', { locale: fr });
  doc.setFontSize(9);
  doc.text(dateStr, PAGE_WIDTH - MARGIN, y, { align: 'right' });

  // Patient info
  const patientName = `${prescription.patient?.first_name || ''} ${prescription.patient?.last_name || ''}`.trim();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(patientName, MARGIN, y);
  y += 4;

  if (prescription.patient?.dob) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const birthDate = format(new Date(prescription.patient.dob), 'dd/MM/yyyy');
    doc.text(`Né(e) le ${birthDate}`, MARGIN, y);
    y += 4;
  }

  // ALD badge if applicable
  if (prescription.is_ald) {
    y += 2;
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(MARGIN, y - 3, 45, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('AFFECTION LONGUE DURÉE', MARGIN + 2, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // Renewal info
  if (prescription.is_renewable && prescription.renewal_count && prescription.renewal_count > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Renouvellement autorisé: ${prescription.renewal_count} fois`, MARGIN, y);
    y += 5;
  }

  y += 4;

  // Medications
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIPTION', MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  
  prescription.medications.forEach((med: Medication, index: number) => {
    // Check if we need a new page
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = MARGIN;
    }

    // Medication name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const medLine = `${index + 1}. ${med.name}`;
    doc.text(medLine, MARGIN, y);
    y += 4;

    // Non-substitutable badge
    if (med.isNonSubstitutable) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(220, 38, 38);
      doc.text('NON SUBSTITUABLE', MARGIN + 5, y);
      doc.setTextColor(0, 0, 0);
      y += 3.5;
    }

    // Dosage
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (med.dosage) {
      doc.text(`Posologie: ${med.dosage}`, MARGIN + 5, y);
      y += 3.5;
    }

    // Duration
    if (med.duration) {
      doc.text(`Durée: ${med.duration}`, MARGIN + 5, y);
      y += 3.5;
    }

    // Instructions
    if (med.instructions) {
      const instructionLines = doc.splitTextToSize(med.instructions, CONTENT_WIDTH - 10);
      instructionLines.forEach((line: string) => {
        doc.text(line, MARGIN + 5, y);
        y += 3.5;
      });
    }

    y += 3;
  });

  // Notes
  if (prescription.notes) {
    y += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(`Note: ${prescription.notes}`, CONTENT_WIDTH);
    noteLines.forEach((line: string) => {
      doc.text(line, MARGIN, y);
      y += 4;
    });
  }

  // Signature area
  y = Math.max(y + 10, PAGE_HEIGHT - 45);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature du prescripteur:', MARGIN, y);
  y += 5;

  // Add signature image if available
  if (signatureUrl) {
    try {
      const img = await loadImage(signatureUrl);
      const maxWidth = 40;
      const maxHeight = 20;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;
      doc.addImage(img, 'PNG', MARGIN, y, width, height);
      y += height + 3;
    } catch (err) {
      console.error('Error loading signature:', err);
    }
  }

  // Footer with signed date
  if (prescription.signed_at) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const signedDate = format(new Date(prescription.signed_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
    doc.text(`Signé électroniquement le ${signedDate}`, MARGIN, PAGE_HEIGHT - MARGIN);
  }

  return doc;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function downloadPrescriptionPdf(data: PrescriptionPdfData): Promise<void> {
  const doc = await generatePrescriptionPdf(data);
  const patientName = `${data.prescription.patient?.last_name || 'patient'}`.toLowerCase();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  doc.save(`ordonnance-${patientName}-${dateStr}.pdf`);
}

export async function printPrescriptionPdf(data: PrescriptionPdfData): Promise<void> {
  const doc = await generatePrescriptionPdf(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
}
