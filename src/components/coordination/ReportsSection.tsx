import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Copy,
  Calendar,
  TrendingUp,
  FileDown,
  Loader2
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatMonthlyReport, MonthlyReportData, CPAMDossier, TeamAbsence, TeamMeeting } from '@/lib/coordinateurFormatter';
import { ACIIndicator } from '@/hooks/useACIIndicators';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Generate last 12 months options
const generateMonthOptions = () => {
  const options = [];
  for (let i = 0; i < 12; i++) {
    const date = subMonths(new Date(), i);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: fr }),
    });
  }
  return options;
};

interface ReportsSectionProps {
  indicators: ACIIndicator[];
  structureName?: string;
}

export function ReportsSection({ indicators, structureName }: ReportsSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const monthOptions = generateMonthOptions();
  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || '';

  // Mock data for the report - in production, this would be fetched based on selected month
  const mockDossiers: CPAMDossier[] = [
    {
      id: '1',
      title: 'Demande ALD - Diabète type 2',
      dossier_type: 'demande_ald',
      status: 'valide',
      organisme: 'cpam',
      patient_name: 'Martin Jean',
      date_depot: '2024-01-15',
      date_reponse: '2024-01-25',
    },
  ];

  const mockAbsences: TeamAbsence[] = [
    {
      id: '1',
      user_name: 'Dr. Martin',
      absence_type: 'conge',
      start_date: '2024-01-15',
      end_date: '2024-01-22',
      status: 'approved',
    },
  ];

  const mockMeetings: TeamMeeting[] = [
    {
      id: '1',
      title: 'Réunion équipe',
      meeting_date: '2024-01-10T09:00:00',
      meeting_type: 'equipe',
      location: 'Salle A',
      attendees_count: 8,
    },
  ];

  const reportData: MonthlyReportData = {
    month: selectedMonthLabel,
    indicators,
    dossiers: mockDossiers,
    absences: mockAbsences,
    meetings: mockMeetings,
    structureName,
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Import jspdf dynamically
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const reportText = formatMonthlyReport(reportData);
      
      // Add title
      doc.setFontSize(16);
      doc.text(`Rapport mensuel - ${selectedMonthLabel}`, 20, 20);
      
      // Add content
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(reportText, 170);
      doc.text(lines, 20, 35);
      
      // Save
      doc.save(`rapport-${selectedMonth}.pdf`);
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Calculate summary stats
  const totalIndicators = indicators.length;
  const avgProgress = indicators.length > 0
    ? Math.round(indicators.reduce((acc, i) => acc + (i.current_value / i.target_value) * 100, 0) / indicators.length)
    : 0;
  const alertCount = indicators.filter(i => i.status === 'late' || i.status === 'at_risk').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapports et statistiques
            </CardTitle>
            <CardDescription>
              Génération de rapports mensuels
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Progression ACI
            </div>
            <p className="text-2xl font-bold">{avgProgress}%</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              Indicateurs suivis
            </div>
            <p className="text-2xl font-bold">{totalIndicators}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Alertes actives
            </div>
            <p className="text-2xl font-bold text-orange-600">{alertCount}</p>
          </div>
        </div>

        {/* Report Preview */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Aperçu du rapport - {selectedMonthLabel}</h4>
            <div className="flex items-center gap-2">
              <CopyToClipboard
                text={formatMonthlyReport(reportData)}
                label="Copier"
                variant="outline"
                icon={<Copy className="h-4 w-4" />}
              />
              <Button 
                variant="outline" 
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-background p-4 rounded border">
              {formatMonthlyReport(reportData)}
            </pre>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Rapport ACI seul
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Liste dossiers CPAM
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Planning équipe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
