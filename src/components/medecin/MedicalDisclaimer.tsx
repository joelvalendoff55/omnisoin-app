import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalDisclaimerProps {
  variant?: 'warning' | 'info';
  className?: string;
}

export function MedicalDisclaimer({ variant = 'warning', className }: MedicalDisclaimerProps) {
  if (variant === 'info') {
    return (
      <Alert className={cn('bg-blue-500/5 border-blue-500/20', className)}>
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
          Les informations fournies sont basées sur des sources officielles (HAS, Vidal, PubMed, ANSM). 
          Vérifiez toujours les recommandations à la source.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={cn('bg-amber-500/5 border-amber-500/20', className)}>
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm font-medium">
        Information à vérifier
      </AlertTitle>
      <AlertDescription className="text-sm text-amber-600/90 dark:text-amber-400/90 mt-1">
        Ces suggestions ne remplacent pas le jugement clinique. Toute décision thérapeutique 
        appartient au praticien et doit être adaptée au contexte individuel du patient.
      </AlertDescription>
    </Alert>
  );
}
