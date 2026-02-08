import { useState } from 'react';
import { ArrowRight, Check, Loader2, Pill, Stethoscope, FileText, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';
import {
  importMedicationsAsAntecedents,
  importDiagnosesAsAntecedents,
  importProceduresAsAntecedents,
  OCRMedication,
} from '@/lib/ocrImport';
import { createImportRecord } from '@/lib/ocrImportHistory';
import { checkAndNotifyInteractionsAfterImport } from '@/lib/drugInteractionAlerts';

interface OCRImportButtonProps {
  patientId: string;
  documentId?: string;
  documentTitle?: string;
  medications?: OCRMedication[];
  diagnoses?: string[];
  procedures?: string[];
  onImportComplete?: () => void;
}

export function OCRImportButton({
  patientId,
  documentId,
  documentTitle,
  medications = [],
  diagnoses = [],
  procedures = [],
  onImportComplete,
}: OCRImportButtonProps) {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  // Selection state
  const [selectedMeds, setSelectedMeds] = useState<Set<number>>(
    new Set(medications.map((_, i) => i))
  );
  const [selectedDiags, setSelectedDiags] = useState<Set<number>>(
    new Set(diagnoses.map((_, i) => i))
  );
  const [selectedProcs, setSelectedProcs] = useState<Set<number>>(
    new Set(procedures.map((_, i) => i))
  );

  const totalItems = medications.length + diagnoses.length + procedures.length;
  const selectedCount = selectedMeds.size + selectedDiags.size + selectedProcs.size;

  const toggleMed = (index: number) => {
    setSelectedMeds(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleDiag = (index: number) => {
    setSelectedDiags(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleProc = (index: number) => {
    setSelectedProcs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleImport = async () => {
    if (!user || !structureId) {
      toast.error('Session non disponible');
      return;
    }

    if (selectedCount === 0) {
      toast.error('Sélectionnez au moins un élément');
      return;
    }

    setImporting(true);

    try {
      let totalImported = 0;
      let medicationsImported = 0;
      const allErrors: string[] = [];
      const allAntecedentIds: string[] = [];

      // Import selected medications
      if (selectedMeds.size > 0) {
        const medsToImport = medications.filter((_, i) => selectedMeds.has(i));
        const result = await importMedicationsAsAntecedents(
          patientId,
          structureId,
          user.id,
          medsToImport,
          documentTitle
        );
        totalImported += result.imported;
        medicationsImported = result.imported;
        allErrors.push(...result.errors);
        allAntecedentIds.push(...result.antecedentIds);
      }

      // Import selected diagnoses
      if (selectedDiags.size > 0) {
        const diagsToImport = diagnoses.filter((_, i) => selectedDiags.has(i));
        const result = await importDiagnosesAsAntecedents(
          patientId,
          structureId,
          user.id,
          diagsToImport,
          documentTitle
        );
        totalImported += result.imported;
        allErrors.push(...result.errors);
        allAntecedentIds.push(...result.antecedentIds);
      }

      // Import selected procedures
      if (selectedProcs.size > 0) {
        const procsToImport = procedures.filter((_, i) => selectedProcs.has(i));
        const result = await importProceduresAsAntecedents(
          patientId,
          structureId,
          user.id,
          procsToImport,
          documentTitle
        );
        totalImported += result.imported;
        allErrors.push(...result.errors);
        allAntecedentIds.push(...result.antecedentIds);
      }

      // Create import history record
      if (totalImported > 0) {
        await createImportRecord({
          patientId,
          structureId,
          documentId,
          documentTitle,
          importedBy: user.id,
          medicationsCount: medicationsImported,
          diagnosesCount: selectedDiags.size,
          proceduresCount: selectedProcs.size,
          antecedentIds: allAntecedentIds,
        });
        toast.success(`${totalImported} élément(s) importé(s) dans le dossier patient`);
        setImported(true);
        onImportComplete?.();

        // Analyze drug interactions if medications were imported
        if (medicationsImported > 0) {
          // Get patient name for notifications
          const { data: patient } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', patientId)
            .single();

          const patientName = patient 
            ? `${patient.first_name} ${patient.last_name}`
            : 'Patient';

          // Trigger interaction analysis in background (non-blocking)
          checkAndNotifyInteractionsAfterImport(
            patientId,
            structureId,
            patientName,
            user.id,
            medicationsImported
          ).then(result => {
            if (result?.hasCritical) {
              const criticalCount = result.interactions.filter(i => i.severity === 'high').length;
              toast.warning(
                `⚠️ ${criticalCount} interaction(s) médicamenteuse(s) critique(s) détectée(s)`,
                {
                  description: 'Les praticiens concernés ont été notifiés.',
                  duration: 8000,
                  action: {
                    label: 'Voir',
                    onClick: () => window.location.href = `/patients/${patientId}`,
                  },
                }
              );
            }
          }).catch(err => {
            console.error('Background interaction analysis failed:', err);
          });
        }
      }

      if (allErrors.length > 0) {
        toast.warning(`${allErrors.length} erreur(s) lors de l'import`);
      }

      setOpen(false);
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  if (totalItems === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={imported ? 'outline' : 'default'}
          size="sm"
          className="gap-2"
          disabled={imported}
        >
          {imported ? (
            <>
              <Check className="h-4 w-4" />
              Importé
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              Importer dans le dossier
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Importer les données OCR
          </AlertDialogTitle>
          <AlertDialogDescription>
            Sélectionnez les éléments à ajouter aux antécédents du patient.
            Les médicaments seront ajoutés comme traitements en cours.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {/* Medications */}
            {medications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Pill className="h-4 w-4 text-primary" />
                  Médicaments ({selectedMeds.size}/{medications.length})
                </div>
                <div className="space-y-1.5 pl-6">
                  {medications.map((med, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedMeds.has(i)}
                        onCheckedChange={() => toggleMed(i)}
                        id={`med-${i}`}
                      />
                      <label
                        htmlFor={`med-${i}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        <span className="font-medium">{med.name}</span>
                        {med.dosage && (
                          <span className="text-muted-foreground ml-1">
                            - {med.dosage}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnoses */}
            {diagnoses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Stethoscope className="h-4 w-4 text-orange-500" />
                  Diagnostics ({selectedDiags.size}/{diagnoses.length})
                </div>
                <div className="space-y-1.5 pl-6">
                  {diagnoses.map((diag, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedDiags.has(i)}
                        onCheckedChange={() => toggleDiag(i)}
                        id={`diag-${i}`}
                      />
                      <label
                        htmlFor={`diag-${i}`}
                        className="text-sm cursor-pointer"
                      >
                        {diag}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Procedures */}
            {procedures.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Procédures ({selectedProcs.size}/{procedures.length})
                </div>
                <div className="space-y-1.5 pl-6">
                  {procedures.map((proc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedProcs.has(i)}
                        onCheckedChange={() => toggleProc(i)}
                        id={`proc-${i}`}
                      />
                      <label
                        htmlFor={`proc-${i}`}
                        className="text-sm cursor-pointer"
                      >
                        {proc}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Les données importées seront visibles dans l'onglet Antécédents du dossier patient.
          </span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={importing}>Annuler</AlertDialogCancel>
          <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                Importer {selectedCount} élément{selectedCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
