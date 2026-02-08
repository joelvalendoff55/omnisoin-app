import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertTriangle } from 'lucide-react';
import { CotationCode } from './CotationSection';

// Placeholder suggestions - will be replaced by AI suggestions
const PLACEHOLDER_SUGGESTIONS: Omit<CotationCode, 'id'>[] = [
  { code: 'G', libelle: 'Consultation du médecin généraliste', type: 'NGAP' },
  { code: 'C', libelle: 'Consultation du médecin spécialiste', type: 'NGAP' },
  { code: 'V', libelle: 'Visite du médecin généraliste', type: 'NGAP' },
  { code: 'CCAM001', libelle: 'ECG de repos (12 dérivations au moins)', type: 'CCAM' },
  { code: 'DEQP003', libelle: 'ECG sur au moins 12 dérivations', type: 'CCAM' },
  { code: 'YYYY010', libelle: 'Séance de rééducation', type: 'NGAP' },
  { code: 'ALQP004', libelle: 'Radiographie du thorax', type: 'CCAM' },
  { code: 'MPC', libelle: 'Majoration personne âgée', type: 'NGAP' },
];

interface CotationSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCode: (code: Omit<CotationCode, 'id'>) => void;
  existingCodes: CotationCode[];
}

export function CotationSuggestionsModal({
  open,
  onOpenChange,
  onAddCode,
  existingCodes,
}: CotationSuggestionsModalProps) {
  const [addedCodes, setAddedCodes] = useState<string[]>([]);

  const handleAddCode = (suggestion: Omit<CotationCode, 'id'>) => {
    onAddCode(suggestion);
    setAddedCodes(prev => [...prev, suggestion.code]);
  };

  const isAlreadyAdded = (code: string) => {
    return existingCodes.some(c => c.code === code) || addedCodes.includes(code);
  };

  // Reset added codes when modal closes
  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setAddedCodes([]);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggestions de cotation</DialogTitle>
          <DialogDescription>
            Codes proposés en fonction du contenu de la consultation
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            Les suggestions sont fournies à titre indicatif. La cotation finale reste de la responsabilité du praticien.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 mt-4">
          {PLACEHOLDER_SUGGESTIONS.map((suggestion, idx) => {
            const alreadyAdded = isAlreadyAdded(suggestion.code);
            
            return (
              <div
                key={`${suggestion.code}-${idx}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{suggestion.code}</span>
                    <Badge
                      variant={suggestion.type === 'CCAM' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {suggestion.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.libelle}</p>
                </div>
                <Button
                  size="sm"
                  variant={alreadyAdded ? 'outline' : 'default'}
                  disabled={alreadyAdded}
                  onClick={() => handleAddCode(suggestion)}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {alreadyAdded ? 'Ajouté' : 'Ajouter'}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
