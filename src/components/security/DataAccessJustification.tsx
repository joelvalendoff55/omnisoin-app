import React, { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Stethoscope, 
  AlertTriangle, 
  ClipboardCheck, 
  Scale, 
  FlaskConical, 
  User,
  Shield 
} from 'lucide-react';
import { ACCESS_REASON_CATEGORIES, DataAccessAction, SensitivityLevel, SENSITIVITY_LABELS, SENSITIVITY_COLORS } from '@/lib/dataAccess';

interface DataAccessJustificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, category: string) => void;
  resourceType: string;
  fieldName: string;
  sensitivityLevel: SensitivityLevel;
  actionType: DataAccessAction;
}

const ICONS: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  ClipboardCheck: <ClipboardCheck className="h-4 w-4" />,
  Scale: <Scale className="h-4 w-4" />,
  FlaskConical: <FlaskConical className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
};

const ACTION_LABELS: Record<DataAccessAction, string> = {
  read: 'Lecture',
  decrypt: 'Déchiffrement',
  export: 'Export',
  print: 'Impression',
};

export function DataAccessJustification({
  open,
  onOpenChange,
  onConfirm,
  resourceType,
  fieldName,
  sensitivityLevel,
  actionType,
}: DataAccessJustificationProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('consultation');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    const category = ACCESS_REASON_CATEGORIES.find(c => c.value === selectedCategory);
    const reason = customReason.trim() 
      ? `${category?.label}: ${customReason}` 
      : category?.label || 'Non spécifié';
    
    setIsSubmitting(true);
    try {
      await onConfirm(reason, selectedCategory);
      onOpenChange(false);
      setCustomReason('');
      setSelectedCategory('consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Justification d'accès requise
          </DialogTitle>
          <DialogDescription>
            L'accès aux données sensibles est tracé conformément au RGPD.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info about the field being accessed */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {resourceType}.{fieldName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Action: {ACTION_LABELS[actionType]}
              </p>
            </div>
            <Badge className={SENSITIVITY_COLORS[sensitivityLevel]}>
              {SENSITIVITY_LABELS[sensitivityLevel]}
            </Badge>
          </div>

          {/* Category selection */}
          <div className="space-y-3">
            <Label>Motif de l'accès *</Label>
            <RadioGroup
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              className="grid grid-cols-2 gap-2"
            >
              {ACCESS_REASON_CATEGORIES.map((category) => (
                <div key={category.value}>
                  <RadioGroupItem
                    value={category.value}
                    id={category.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={category.value}
                    className="flex items-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    {ICONS[category.icon]}
                    <span className="text-sm">{category.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom reason */}
          <div className="space-y-2">
            <Label htmlFor="custom-reason">Précisions (optionnel)</Label>
            <Textarea
              id="custom-reason"
              placeholder="Détails supplémentaires sur le motif de l'accès..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Legal notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Cet accès sera horodaté et enregistré dans le journal d'audit RGPD. 
              Tout accès non justifié peut faire l'objet d'une enquête.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enregistrement...' : 'Confirmer l\'accès'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
