import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileDown, Calendar, Scale, FileText, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  createExportRequest,
  ExportType,
  ExportFormat,
  EXPORT_TYPE_LABELS,
  EXPORT_FORMAT_LABELS,
  LEGAL_BASIS_OPTIONS,
} from '@/lib/exports';

interface ExportRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patientName?: string;
  onSuccess?: () => void;
}

export function ExportRequestForm({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSuccess,
}: ExportRequestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('rgpd_patient_data');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [legalBasis, setLegalBasis] = useState('');
  const [justification, setJustification] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  const isPatientExport = exportType.startsWith('rgpd_') && exportType !== 'rgpd_rectification';
  const requiresDateRange = ['has_certification', 'audit_trail', 'medical_legal_archive'].includes(exportType);

  const handleSubmit = async () => {
    if (!legalBasis) {
      toast({
        title: 'Erreur',
        description: 'La base juridique est obligatoire.',
        variant: 'destructive',
      });
      return;
    }

    if (!justification || justification.length < 10) {
      toast({
        title: 'Erreur',
        description: 'La justification doit contenir au moins 10 caractères.',
        variant: 'destructive',
      });
      return;
    }

    if (isPatientExport && !patientId) {
      toast({
        title: 'Erreur',
        description: 'Un patient doit être sélectionné pour cet export.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresDateRange && (!dateRangeStart || !dateRangeEnd)) {
      toast({
        title: 'Erreur',
        description: 'Les dates de début et fin sont obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await createExportRequest({
        patientId: isPatientExport ? patientId : undefined,
        exportType,
        exportFormat,
        legalBasis,
        justification,
        dateRangeStart: requiresDateRange ? dateRangeStart : undefined,
        dateRangeEnd: requiresDateRange ? dateRangeEnd : undefined,
      });

      toast({
        title: 'Demande créée',
        description: 'Votre demande d\'export a été enregistrée.',
      });

      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setExportType('rgpd_patient_data');
      setExportFormat('pdf');
      setLegalBasis('');
      setJustification('');
      setDateRangeStart('');
      setDateRangeEnd('');
    } catch (error) {
      console.error('Error creating export request:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la demande d\'export.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Nouvelle demande d'export
          </DialogTitle>
          <DialogDescription>
            Créez une demande d'export conforme RGPD ou HAS. Une justification est obligatoire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient info if provided */}
          {patientName && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Export pour le patient : <strong>{patientName}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Export Type */}
          <div className="space-y-2">
            <Label>Type d'export *</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPORT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label>Format *</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPORT_FORMAT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legal Basis */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Base juridique *
            </Label>
            <Select value={legalBasis} onValueChange={setLegalBasis}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une base juridique" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_BASIS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label>Justification détaillée *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Expliquez pourquoi cet export est nécessaire..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 caractères. Cette justification sera archivée.
            </p>
          </div>

          {/* Date Range (for certain export types) */}
          {requiresDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date début *
                </Label>
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date fin *
                </Label>
                <Input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Warning */}
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cette action sera enregistrée dans les logs d'audit immuables.
              L'export généré expirera après 30 jours.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer la demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
