import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientTranscript } from './transcripts';
import { LANGUAGE_LABELS, DetectedLanguage } from './languageDetection';

const SOURCE_LABELS: Record<string, string> = {
  mic: 'Microphone',
  upload: 'Upload fichier',
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
};

/**
 * Generate a PDF for a single transcript
 */
export function exportTranscriptToPdf(transcript: PatientTranscript): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add text with automatic line breaks
  const addWrappedText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.4;
    
    for (const line of lines) {
      if (yPos + lineHeight > pageHeight - margin - 15) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    }
  };

  // Patient name
  const patientName = transcript.patient
    ? `${transcript.patient.first_name} ${transcript.patient.last_name}`
    : 'Patient inconnu';

  // Title
  addWrappedText('TRANSCRIPTION', 18, true, [59, 130, 246]);
  yPos += 5;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Patient info
  addWrappedText('Patient', 10, true, [100, 100, 100]);
  addWrappedText(patientName, 14, true);
  if (transcript.patient?.phone) {
    addWrappedText(transcript.patient.phone, 11, false, [100, 100, 100]);
  }
  yPos += 5;

  // Metadata section
  const dateStr = format(new Date(transcript.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr });
  const sourceStr = SOURCE_LABELS[transcript.source] || transcript.source;
  const langStr = transcript.language 
    ? LANGUAGE_LABELS[transcript.language as DetectedLanguage] || transcript.language
    : 'Non détecté';
  const durationStr = transcript.duration_seconds
    ? `${Math.floor(transcript.duration_seconds / 60)}:${String(transcript.duration_seconds % 60).padStart(2, '0')}`
    : 'N/A';

  // Grid of metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const metaItems = [
    { label: 'Date', value: dateStr },
    { label: 'Source', value: sourceStr },
    { label: 'Langue', value: langStr },
    { label: 'Durée', value: durationStr },
  ];

  for (const item of metaItems) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.label}:`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, margin + 25, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Transcript text
  addWrappedText('Contenu de la transcription', 10, true, [100, 100, 100]);
  yPos += 3;

  if (transcript.transcript_text) {
    // Use a monospace-like appearance for transcript
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    
    const textLines = doc.splitTextToSize(transcript.transcript_text, contentWidth);
    const lineHeight = 5;
    
    for (const line of textLines) {
      if (yPos + lineHeight > pageHeight - margin - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    }
  } else {
    addWrappedText('Aucune transcription disponible', 11, false, [150, 150, 150]);
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    
    const footerText = 'OmniSoin Assist — document généré automatiquement — à vérifier';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
    
    // Page number
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Generate filename
  const dateForFile = format(new Date(transcript.created_at), 'yyyy-MM-dd');
  const patientForFile = patientName.replace(/\s+/g, '_').toLowerCase().slice(0, 20);
  const idShort = transcript.id.slice(0, 8);
  const filename = `transcription_${patientForFile}_${dateForFile}_${idShort}.pdf`;

  doc.save(filename);
}

/**
 * Generate a PDF for multiple transcripts (list export)
 */
export function exportTranscriptsListToPdf(transcripts: PatientTranscript[], maxItems = 20): void {
  if (transcripts.length === 0) {
    return;
  }

  const itemsToExport = transcripts.slice(0, maxItems);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Cover page
  let yPos = 50;
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('LISTE DES TRANSCRIPTIONS', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Export du ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.text(`${itemsToExport.length} transcription(s)`, pageWidth / 2, yPos, { align: 'center' });

  // Each transcript on its own page
  for (let idx = 0; idx < itemsToExport.length; idx++) {
    const transcript = itemsToExport[idx];
    doc.addPage();
    yPos = margin;

    const patientName = transcript.patient
      ? `${transcript.patient.first_name} ${transcript.patient.last_name}`
      : 'Patient inconnu';

    // Header with number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`Transcription ${idx + 1}/${itemsToExport.length}`, margin, yPos);
    yPos += 8;

    // Patient name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(patientName, margin, yPos);
    yPos += 8;

    // Date and metadata
    const dateStr = format(new Date(transcript.created_at), 'dd/MM/yyyy HH:mm', { locale: fr });
    const sourceStr = SOURCE_LABELS[transcript.source] || transcript.source;
    const langStr = transcript.language
      ? LANGUAGE_LABELS[transcript.language as DetectedLanguage] || transcript.language
      : '-';
    const statusLabels: Record<string, string> = {
      uploaded: 'À transcrire',
      transcribing: 'En cours',
      ready: 'Prêt',
      failed: 'Échec',
    };

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${dateStr} | Source: ${sourceStr} | Langue: ${langStr} | Statut: ${statusLabels[transcript.status] || transcript.status}`, margin, yPos);
    yPos += 8;

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Transcript text
    if (transcript.transcript_text) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);

      const textLines = doc.splitTextToSize(transcript.transcript_text, contentWidth);
      const lineHeight = 4.5;
      const maxLines = Math.floor((pageHeight - yPos - 25) / lineHeight);

      for (let i = 0; i < Math.min(textLines.length, maxLines); i++) {
        doc.text(textLines[i], margin, yPos);
        yPos += lineHeight;
      }

      if (textLines.length > maxLines) {
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('[Texte tronqué — voir export individuel]', margin, yPos);
      }
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Pas de transcription disponible', margin, yPos);
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);

    const footerText = 'OmniSoin Assist — document généré automatiquement — à vérifier';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);

    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Filename
  const dateForFile = format(new Date(), 'yyyy-MM-dd');
  const filename = `transcriptions_export_${dateForFile}.pdf`;

  doc.save(filename);
}
