import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Building2,
  Euro,
  Loader2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import type { Invoice } from './BillingDashboard';

interface AccountingExportProps {
  invoices: Invoice[];
  structureInfo: {
    name: string;
    address: string;
    siret?: string;
    tvaNumber?: string;
  };
}

type ExportFormat = 'pdf' | 'csv' | 'fec';
type ExportType = 'invoices' | 'payments' | 'accounting';

const ACCOUNTING_SOFTWARE = [
  { id: 'sage', name: 'Sage', format: 'csv' },
  { id: 'ciel', name: 'Ciel Compta', format: 'csv' },
  { id: 'ebp', name: 'EBP', format: 'csv' },
  { id: 'quadra', name: 'QuadraCompta', format: 'csv' },
  { id: 'fec', name: 'FEC (légal)', format: 'fec' },
];

export function AccountingExport({ invoices, structureInfo }: AccountingExportProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportType, setExportType] = useState<ExportType>('invoices');
  const [selectedSoftware, setSelectedSoftware] = useState<string>('');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ date: Date; type: string } | null>(null);

  // Quick date range options
  const setQuickRange = (months: number) => {
    const now = new Date();
    const from = startOfMonth(subMonths(now, months - 1));
    const to = endOfMonth(now);
    setDateRange({ from, to });
  };

  // Filter invoices by date range
  const filteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.date);
    return (!dateRange.from || invDate >= dateRange.from) &&
           (!dateRange.to || invDate <= dateRange.to);
  });

  // Generate CSV content
  const generateCSV = (data: Invoice[], type: ExportType): string => {
    const headers = type === 'payments'
      ? ['Date', 'N° Facture', 'Patient', 'Montant', 'Date paiement', 'Mode']
      : ['Date', 'N° Facture', 'Patient', 'Praticien', 'Type', 'Montant HT', 'TVA', 'Montant TTC', 'Statut'];

    const rows = data.map(inv => {
      if (type === 'payments' && inv.status === 'paid') {
        return [
          format(new Date(inv.date), 'dd/MM/yyyy'),
          inv.id,
          inv.patient_name,
          inv.amount.toFixed(2),
          inv.payment_date ? format(new Date(inv.payment_date), 'dd/MM/yyyy') : '',
          'CB/Espèces',
        ];
      }
      return [
        format(new Date(inv.date), 'dd/MM/yyyy'),
        inv.id,
        inv.patient_name,
        inv.practitioner_name,
        inv.care_type,
        inv.amount.toFixed(2),
        '0.00',
        inv.amount.toFixed(2),
        inv.status === 'paid' ? 'Payé' : inv.status === 'pending' ? 'En attente' : 'Impayé',
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    return csvContent;
  };

  // Generate PDF content
  const generatePDF = async (data: Invoice[], type: ExportType) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text(structureInfo.name, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(structureInfo.address, pageWidth / 2, 28, { align: 'center' });
    
    if (structureInfo.siret) {
      doc.text(`SIRET: ${structureInfo.siret}`, pageWidth / 2, 34, { align: 'center' });
    }

    // Title
    doc.setFontSize(14);
    const title = type === 'invoices' 
      ? 'Journal des factures'
      : type === 'payments'
      ? 'Journal des encaissements'
      : 'Export comptable';
    doc.text(title, 14, 50);

    // Period
    doc.setFontSize(10);
    const period = dateRange.from && dateRange.to
      ? `Période: ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`
      : 'Toutes les dates';
    doc.text(period, 14, 58);

    // Summary
    if (includeSummary) {
      const totalAmount = data.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = data.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
      
      doc.setFontSize(11);
      doc.text(`Total facturé: ${totalAmount.toFixed(2)} €`, 14, 70);
      doc.text(`Total encaissé: ${paidAmount.toFixed(2)} €`, 14, 78);
      doc.text(`En attente: ${(totalAmount - paidAmount).toFixed(2)} €`, 14, 86);
    }

    // Table
    if (includeDetails) {
      let y = includeSummary ? 100 : 70;
      
      // Headers
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 14, y);
      doc.text('Patient', 40, y);
      doc.text('Type', 100, y);
      doc.text('Montant', 140, y);
      doc.text('Statut', 170, y);
      
      doc.setFont('helvetica', 'normal');
      y += 6;
      
      // Rows
      data.slice(0, 40).forEach(inv => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(format(new Date(inv.date), 'dd/MM/yy'), 14, y);
        doc.text(inv.patient_name.slice(0, 25), 40, y);
        doc.text(inv.care_type.slice(0, 20), 100, y);
        doc.text(`${inv.amount.toFixed(2)} €`, 140, y);
        doc.text(inv.status === 'paid' ? 'Payé' : 'En attente', 170, y);
        
        y += 6;
      });

      if (data.length > 40) {
        doc.text(`... et ${data.length - 40} autres lignes`, 14, y + 6);
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })} - Page ${i}/${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
    }

    return doc;
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let dataToExport = filteredInvoices;
      
      if (exportType === 'payments') {
        dataToExport = filteredInvoices.filter(i => i.status === 'paid');
      }

      if (exportFormat === 'pdf') {
        const doc = await generatePDF(dataToExport, exportType);
        const filename = `${exportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(filename);
      } else if (exportFormat === 'csv' || exportFormat === 'fec') {
        const csvContent = generateCSV(dataToExport, exportType);
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'fec' ? 'txt' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setLastExport({ date: new Date(), type: exportType });
      toast.success('Export généré avec succès');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de la génération de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export comptable
        </CardTitle>
        <CardDescription>
          Générez des exports PDF, CSV ou FEC pour votre comptabilité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-3">
          <Label>Période</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(1)}
            >
              Ce mois
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(3)}
            >
              3 derniers mois
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(12)}
            >
              12 derniers mois
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Personnalisé
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>
          {dateRange.from && dateRange.to && (
            <p className="text-sm text-muted-foreground">
              Du {format(dateRange.from, 'dd MMMM yyyy', { locale: fr })} au {format(dateRange.to, 'dd MMMM yyyy', { locale: fr })}
              <span className="ml-2">({filteredInvoices.length} factures)</span>
            </p>
          )}
        </div>

        <Separator />

        {/* Export Type */}
        <div className="space-y-3">
          <Label>Type d'export</Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              className={`p-4 rounded-lg border text-left transition-all ${
                exportType === 'invoices' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setExportType('invoices')}
            >
              <FileText className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Journal des factures</p>
              <p className="text-xs text-muted-foreground">Toutes les factures émises</p>
            </button>
            <button
              className={`p-4 rounded-lg border text-left transition-all ${
                exportType === 'payments' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setExportType('payments')}
            >
              <Euro className="h-5 w-5 mb-2 text-green-600" />
              <p className="font-medium text-sm">Encaissements</p>
              <p className="text-xs text-muted-foreground">Paiements reçus uniquement</p>
            </button>
            <button
              className={`p-4 rounded-lg border text-left transition-all ${
                exportType === 'accounting' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setExportType('accounting')}
            >
              <Building2 className="h-5 w-5 mb-2 text-blue-600" />
              <p className="font-medium text-sm">Export comptable</p>
              <p className="text-xs text-muted-foreground">Format logiciel comptable</p>
            </button>
          </div>
        </div>

        {/* Format */}
        <div className="space-y-3">
          <Label>Format de fichier</Label>
          <div className="flex flex-wrap gap-3">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                exportFormat === 'pdf' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setExportFormat('pdf')}
            >
              <FileText className="h-4 w-4 text-red-600" />
              PDF
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                exportFormat === 'csv' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setExportFormat('csv')}
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              CSV / Excel
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                exportFormat === 'fec' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setExportFormat('fec')}
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              FEC (légal)
            </button>
          </div>
        </div>

        {/* Accounting Software Integration */}
        {exportType === 'accounting' && (
          <div className="space-y-3">
            <Label>Logiciel comptable (optionnel)</Label>
            <Select value={selectedSoftware} onValueChange={setSelectedSoftware}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un format..." />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNTING_SOFTWARE.map((sw) => (
                  <SelectItem key={sw.id} value={sw.id}>
                    <div className="flex items-center gap-2">
                      {sw.name}
                      <Badge variant="outline" className="text-xs">{sw.format.toUpperCase()}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          <Label>Options</Label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={includeDetails}
                onCheckedChange={(c) => setIncludeDetails(!!c)}
              />
              <span className="text-sm">Inclure le détail des factures</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={includeSummary}
                onCheckedChange={(c) => setIncludeSummary(!!c)}
              />
              <span className="text-sm">Inclure le récapitulatif</span>
            </label>
          </div>
        </div>

        <Separator />

        {/* Export Button */}
        <div className="flex items-center justify-between">
          <div>
            {lastExport && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Dernier export: {format(lastExport.date, 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            )}
          </div>
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredInvoices.length === 0}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Générer l'export
              </>
            )}
          </Button>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Intégration comptable</p>
              <p className="text-sm text-blue-700 mt-1">
                Les exports CSV sont compatibles avec la plupart des logiciels comptables. 
                Le format FEC est requis pour les contrôles fiscaux.
              </p>
              <a
                href="#"
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mt-2"
              >
                En savoir plus
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
