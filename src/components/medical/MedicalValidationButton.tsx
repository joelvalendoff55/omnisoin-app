"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  Shield, 
  Clock, 
  User, 
  FileCheck, 
  AlertTriangle,
  History,
  Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMedicalValidation, ValidationEntry } from '@/hooks/useMedicalValidation';
import { useRole } from '@/hooks/useRole';

interface MedicalValidationButtonProps {
  consultationId: string;
  consultationContent: Record<string, unknown>;
  structureId: string;
  patientId: string;
  className?: string;
  onValidated?: (validation: ValidationEntry) => void;
}

export function MedicalValidationButton({
  consultationId,
  consultationContent,
  structureId,
  patientId,
  className,
  onValidated,
}: MedicalValidationButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [customStatement, setCustomStatement] = useState('');
  const [latestValidation, setLatestValidation] = useState<ValidationEntry | null>(null);
  const [validationHistory, setValidationHistory] = useState<ValidationEntry[]>([]);
  
  const { validateConsultation, getLatestValidation, getValidationHistory, loading } = useMedicalValidation();
  const { isPractitioner, isAdmin } = useRole();

  const canValidate = isPractitioner || isAdmin;

  useEffect(() => {
    const loadValidation = async () => {
      const latest = await getLatestValidation(consultationId);
      setLatestValidation(latest);
    };
    loadValidation();
  }, [consultationId, getLatestValidation]);

  const loadHistory = async () => {
    const history = await getValidationHistory(consultationId);
    setValidationHistory(history);
  };

  const handleValidate = async () => {
    if (!confirmed) return;

    const validation = await validateConsultation({
      consultationId,
      consultationContent,
      structureId,
      patientId,
      customStatement: customStatement || undefined,
    });

    if (validation) {
      setLatestValidation(validation);
      setIsDialogOpen(false);
      setConfirmed(false);
      setCustomStatement('');
      onValidated?.(validation);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "dd MMM yyyy 'à' HH:mm:ss", { locale: fr });
  };

  // Already validated state
  if (latestValidation) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Popover onOpenChange={(open) => open && loadHistory()}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Validée par</span>
              <span className="font-medium">{latestValidation.validator_name}</span>
              <History className="h-3 w-3 ml-1 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="p-4 border-b bg-emerald-50/50 dark:bg-emerald-900/20">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Validation médicale
                </span>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Current validation */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{latestValidation.validator_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {latestValidation.validator_role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimestamp(latestValidation.validated_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Fingerprint className="h-4 w-4" />
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {latestValidation.signature_hash.substring(0, 16)}...
                  </span>
                </div>
              </div>

              {/* Statement */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm italic">
                  "{latestValidation.validation_statement}"
                </p>
              </div>

              {/* History */}
              {validationHistory.length > 1 && (
                <>
                  <div className="text-xs text-muted-foreground font-medium pt-2">
                    Historique ({validationHistory.length} validations)
                  </div>
                  <ScrollArea className="max-h-[150px]">
                    <div className="space-y-2">
                      {validationHistory.slice(1).map((v) => (
                        <div key={v.id} className="p-2 bg-muted/30 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{v.validator_name}</span>
                            <span className="text-muted-foreground">v{v.version}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {formatTimestamp(v.validated_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            {/* Re-validate button for practitioners */}
            {canValidate && (
              <div className="p-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Revalider (nouvelle version)
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Validation dialog for re-validation */}
        <ValidationDialog 
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          confirmed={confirmed}
          setConfirmed={setConfirmed}
          customStatement={customStatement}
          setCustomStatement={setCustomStatement}
          loading={loading}
          onValidate={handleValidate}
          isRevalidation={true}
        />
      </div>
    );
  }

  // Not validated - show validation button
  if (!canValidate) {
    return (
      <Badge variant="outline" className={cn('gap-1.5 text-amber-600 border-amber-200', className)}>
        <AlertTriangle className="h-3 w-3" />
        Non validée
      </Badge>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className={cn('gap-2 bg-primary hover:bg-primary/90', className)}
        >
          <Shield className="h-4 w-4" />
          Valider le contenu médical
        </Button>
      </DialogTrigger>
      <ValidationDialog 
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        confirmed={confirmed}
        setConfirmed={setConfirmed}
        customStatement={customStatement}
        setCustomStatement={setCustomStatement}
        loading={loading}
        onValidate={handleValidate}
        isRevalidation={false}
      />
    </Dialog>
  );
}

interface ValidationDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  confirmed: boolean;
  setConfirmed: (confirmed: boolean) => void;
  customStatement: string;
  setCustomStatement: (statement: string) => void;
  loading: boolean;
  onValidate: () => void;
  isRevalidation: boolean;
}

function ValidationDialog({
  isOpen,
  setIsOpen,
  confirmed,
  setConfirmed,
  customStatement,
  setCustomStatement,
  loading,
  onValidate,
  isRevalidation,
}: ValidationDialogProps) {
  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {isRevalidation ? 'Revalider la consultation' : 'Validation médicale'}
        </DialogTitle>
        <DialogDescription>
          Cette action engage votre responsabilité médicale. Un horodatage et une signature numérique seront enregistrés.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Avertissement médico-légal</p>
              <p>
                En validant cette consultation, vous attestez avoir vérifié et approuvé 
                l'ensemble du contenu médical, y compris les éléments générés par l'IA.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-statement">Déclaration (optionnel)</Label>
          <Textarea
            id="custom-statement"
            placeholder="Je valide le contenu médical de cette consultation"
            value={customStatement}
            onChange={(e) => setCustomStatement(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Vous pouvez personnaliser votre déclaration de validation ou laisser vide pour utiliser la formule standard.
          </p>
        </div>

        <div className="flex items-start space-x-3 pt-2">
          <Checkbox
            id="confirm-validation"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
          />
          <label
            htmlFor="confirm-validation"
            className="text-sm leading-relaxed cursor-pointer"
          >
            Je confirme avoir relu et vérifié l'intégralité du contenu de cette consultation, 
            et j'en assume la responsabilité médicale.
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Annuler
        </Button>
        <Button 
          onClick={onValidate} 
          disabled={!confirmed || loading}
          className="gap-2"
        >
          {loading ? (
            <>Validation en cours...</>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {isRevalidation ? 'Confirmer la revalidation' : 'Valider et signer'}
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
