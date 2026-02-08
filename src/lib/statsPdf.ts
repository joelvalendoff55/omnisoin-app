import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AdminDashboardStats } from '@/lib/structureAdmin';

interface StructureInfo {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
}

export async function generateStatsPdf(
  stats: AdminDashboardStats,
  structureInfo: StructureInfo
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper for centering text
  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Add logo if available
  if (structureInfo.logoUrl) {
    try {
      const img = await loadImage(structureInfo.logoUrl);
      const logoWidth = 40;
      const logoHeight = (img.height / img.width) * logoWidth;
      doc.addImage(img, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, Math.min(logoHeight, 30));
      yPos += Math.min(logoHeight, 30) + 10;
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }
  }

  // Title
  doc.setFont('helvetica', 'bold');
  centerText(structureInfo.name || 'Rapport de Statistiques', yPos, 18);
  yPos += 10;

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  centerText(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, yPos, 10);
  yPos += 15;

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Structure info
  if (structureInfo.address || structureInfo.phone) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    if (structureInfo.address) {
      centerText(structureInfo.address, yPos, 9);
      yPos += 5;
    }
    if (structureInfo.phone) {
      centerText(structureInfo.phone, yPos, 9);
      yPos += 5;
    }
    yPos += 10;
    doc.setTextColor(0, 0, 0);
  }

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // KPI Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Indicateurs Clés', margin, yPos);
  yPos += 10;

  // KPI Cards (simulated)
  const kpis = [
    { label: 'Patients du jour', value: stats.patientsToday.toString(), unit: '' },
    { label: 'Consultations (semaine)', value: stats.consultationsThisWeek.toString(), unit: '' },
    { label: 'Temps d\'attente moyen', value: stats.avgWaitTimeMinutes.toString(), unit: 'min' },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const cardWidth = (pageWidth - 2 * margin - 20) / 3;
  kpis.forEach((kpi, index) => {
    const x = margin + index * (cardWidth + 10);
    
    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPos, cardWidth, 25, 3, 3, 'F');
    
    // Label
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(kpi.label, x + 5, yPos + 8);
    
    // Value
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${kpi.value}${kpi.unit ? ' ' + kpi.unit : ''}`, x + 5, yPos + 20);
  });

  yPos += 35;
  doc.setFont('helvetica', 'normal');

  // Consultations Last 30 Days Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Évolution des Consultations (30 derniers jours)', margin, yPos);
  yPos += 10;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', margin + 5, yPos + 6);
  doc.text('Consultations', margin + 80, yPos + 6);
  yPos += 10;

  // Table rows (last 10 days for space)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const recentDays = stats.consultationsLast30Days.slice(-10);
  recentDays.forEach((day, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F');
    }
    doc.text(format(new Date(day.date), 'dd/MM/yyyy', { locale: fr }), margin + 5, yPos);
    doc.text(day.count.toString(), margin + 80, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Peak Hours Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Pics d\'Affluence (7 derniers jours)', margin, yPos);
  yPos += 10;

  // Peak hours table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setFontSize(10);
  doc.text('Heure', margin + 5, yPos + 6);
  doc.text('Patients', margin + 80, yPos + 6);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const topHours = stats.peakHours.slice(0, 8);
  topHours.forEach((hour, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F');
    }
    doc.text(`${hour.hour}h00`, margin + 5, yPos);
    doc.text(hour.count.toString(), margin + 80, yPos);
    yPos += 7;
  });

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  centerText(`Document généré automatiquement par OmniSoin - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, yPos, 8);

  // Save PDF
  const filename = `rapport-stats-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

// Helper to load image for jsPDF
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
