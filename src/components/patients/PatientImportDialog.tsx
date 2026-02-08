"use client";

import { useState, useMemo, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PatientImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (patients: ImportedPatient[]) => Promise<void>;
}

interface ImportedPatient {
  first_name: string;
  last_name: string;
  dob?: string;
  sex?: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  note_admin?: string;
}

interface FieldMapping {
  csvColumn: string;
  targetField: keyof ImportedPatient | null;
}

const TARGET_FIELDS: { id: keyof ImportedPatient; label: string; required: boolean }[] = [
  { id: 'first_name', label: 'Prénom', required: true },
  { id: 'last_name', label: 'Nom', required: true },
  { id: 'dob', label: 'Date de naissance', required: false },
  { id: 'sex', label: 'Sexe (M/F/O)', required: false },
  { id: 'phone', label: 'Téléphone', required: false },
  { id: 'email', label: 'Email', required: false },
  { id: 'note_admin', label: 'Note administrative', required: false },
];

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';

export function PatientImportDialog({
  open,
  onOpenChange,
  onImport,
}: PatientImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });

  const resetState = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMappings([]);
    setIsImporting(false);
    setImportResults({ success: 0, errors: [] });
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetState();
    }
    onOpenChange(openState);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    });
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length < 2) {
        toast.error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
        return;
      }

      const headerRow = parsed[0];
      const dataRows = parsed.slice(1);

      setHeaders(headerRow);
      setCsvData(dataRows);

      // Auto-map columns based on header names
      const autoMappings = headerRow.map((header): FieldMapping => {
        const normalized = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let targetField: keyof ImportedPatient | null = null;

        if (normalized.includes('prenom') || normalized === 'first_name' || normalized === 'firstname') {
          targetField = 'first_name';
        } else if (normalized.includes('nom') && !normalized.includes('prenom') || normalized === 'last_name' || normalized === 'lastname') {
          targetField = 'last_name';
        } else if (normalized.includes('naissance') || normalized.includes('dob') || normalized.includes('date_of_birth')) {
          targetField = 'dob';
        } else if (normalized.includes('sexe') || normalized === 'sex' || normalized === 'gender') {
          targetField = 'sex';
        } else if (normalized.includes('tel') || normalized.includes('phone')) {
          targetField = 'phone';
        } else if (normalized.includes('email') || normalized.includes('mail')) {
          targetField = 'email';
        } else if (normalized.includes('note') || normalized.includes('comment')) {
          targetField = 'note_admin';
        }

        return { csvColumn: header, targetField };
      });

      setMappings(autoMappings);
      setStep('mapping');
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const updateMapping = (index: number, targetField: keyof ImportedPatient | null) => {
    setMappings(prev => {
      const updated = [...prev];
      // Clear any existing mapping for this target field
      if (targetField) {
        updated.forEach((m, i) => {
          if (i !== index && m.targetField === targetField) {
            m.targetField = null;
          }
        });
      }
      updated[index] = { ...updated[index], targetField };
      return updated;
    });
  };

  const hasRequiredMappings = useMemo(() => {
    const mappedFields = mappings.map(m => m.targetField).filter(Boolean);
    return TARGET_FIELDS
      .filter(f => f.required)
      .every(f => mappedFields.includes(f.id));
  }, [mappings]);

  const previewPatients = useMemo(() => {
    if (!hasRequiredMappings) return [];

    return csvData.slice(0, 5).map(row => {
      const patient: Partial<ImportedPatient> = {};
      mappings.forEach((mapping, index) => {
        if (mapping.targetField && row[index]) {
          let value = row[index];
          
          // Transform sex values
          if (mapping.targetField === 'sex') {
            const normalized = value.toLowerCase().trim();
            if (normalized === 'm' || normalized === 'masculin' || normalized === 'male' || normalized === 'homme') {
              value = 'M';
            } else if (normalized === 'f' || normalized === 'feminin' || normalized === 'feminine' || normalized === 'female' || normalized === 'femme') {
              value = 'F';
            } else if (normalized === 'o' || normalized === 'autre' || normalized === 'other') {
              value = 'O';
            }
          }

          (patient as any)[mapping.targetField] = value;
        }
      });
      return patient as ImportedPatient;
    });
  }, [csvData, mappings, hasRequiredMappings]);

  const handleImport = async () => {
    setIsImporting(true);
    setStep('importing');

    const patients: ImportedPatient[] = csvData.map(row => {
      const patient: Partial<ImportedPatient> = {};
      mappings.forEach((mapping, index) => {
        if (mapping.targetField && row[index]) {
          let value = row[index];
          
          // Transform sex values
          if (mapping.targetField === 'sex') {
            const normalized = value.toLowerCase().trim();
            if (normalized === 'm' || normalized === 'masculin' || normalized === 'male' || normalized === 'homme') {
              value = 'M';
            } else if (normalized === 'f' || normalized === 'feminin' || normalized === 'feminine' || normalized === 'female' || normalized === 'femme') {
              value = 'F';
            } else if (normalized === 'o' || normalized === 'autre' || normalized === 'other') {
              value = 'O';
            }
          }

          (patient as any)[mapping.targetField] = value;
        }
      });
      return patient as ImportedPatient;
    }).filter(p => p.first_name && p.last_name);

    try {
      await onImport(patients);
      setImportResults({ success: patients.length, errors: [] });
      toast.success(`${patients.length} patients importés avec succès`);
      handleClose(false);
    } catch (error) {
      console.error('Import error:', error);
      setImportResults({ success: 0, errors: ['Erreur lors de l\'import'] });
      toast.error('Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des patients
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Sélectionnez un fichier CSV à importer'}
            {step === 'mapping' && 'Associez les colonnes du fichier aux champs patients'}
            {step === 'preview' && 'Vérifiez les données avant l\'import'}
            {step === 'importing' && 'Import en cours...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-6 rounded-full bg-primary/10">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">Glissez-déposez un fichier CSV</h3>
                <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner un fichier</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Sélectionner un fichier
                </label>
              </Button>
              <p className="text-xs text-muted-foreground">
                Format accepté: CSV (séparateur virgule ou point-virgule)
              </p>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Les champs <strong>Prénom</strong> et <strong>Nom</strong> sont obligatoires.
                    Les autres champs sont optionnels.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {mappings.map((mapping, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{mapping.csvColumn}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Ex: {csvData[0]?.[index] || '-'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Select
                        value={mapping.targetField || '__ignore__'}
                        onValueChange={(v) => updateMapping(index, v === '__ignore__' ? null : v as keyof ImportedPatient)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Ignorer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ignore__">
                            <span className="text-muted-foreground">Ignorer</span>
                          </SelectItem>
                          {TARGET_FIELDS.map((field) => {
                            const isUsed = mappings.some((m, i) => i !== index && m.targetField === field.id);
                            return (
                              <SelectItem
                                key={field.id}
                                value={field.id}
                                disabled={isUsed}
                              >
                                <span className="flex items-center gap-2">
                                  {field.label}
                                  {field.required && <Badge variant="outline" className="text-xs">Requis</Badge>}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <Alert className="bg-success/10 border-success/30">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription>
                    {csvData.length} patients seront importés. Voici un aperçu des 5 premiers:
                  </AlertDescription>
                </Alert>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Date naissance</TableHead>
                      <TableHead>Sexe</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewPatients.map((patient, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{patient.last_name}</TableCell>
                        <TableCell>{patient.first_name}</TableCell>
                        <TableCell>{patient.dob || '-'}</TableCell>
                        <TableCell>{patient.sex || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{patient.phone || '-'}</TableCell>
                        <TableCell className="truncate max-w-[150px]">{patient.email || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {csvData.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Et {csvData.length - 5} autres patients...
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Import en cours...</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Retour
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!hasRequiredMappings}
              >
                Aperçu
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Retour
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import...
                  </>
                ) : (
                  <>Importer {csvData.length} patients</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
