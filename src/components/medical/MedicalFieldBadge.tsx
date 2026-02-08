import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Stethoscope } from 'lucide-react';
import { useIsMedicalDecisionField, useCanWriteField } from '@/hooks/useFieldPermissions';
import { cn } from '@/lib/utils';

interface MedicalFieldBadgeProps {
  tableName: string;
  fieldName: string;
  className?: string;
  showReadOnly?: boolean;
}

export function MedicalFieldBadge({
  tableName,
  fieldName,
  className,
  showReadOnly = true,
}: MedicalFieldBadgeProps) {
  const isMedicalDecision = useIsMedicalDecisionField(tableName, fieldName);
  const canWrite = useCanWriteField(tableName, fieldName);

  if (!isMedicalDecision && canWrite) {
    return null;
  }

  if (isMedicalDecision && !canWrite) {
    return (
      <Badge 
        variant="destructive" 
        className={cn('gap-1 text-xs font-medium', className)}
      >
        <Shield className="h-3 w-3" />
        Réservé Médecin
      </Badge>
    );
  }

  if (isMedicalDecision && canWrite) {
    return (
      <Badge 
        variant="secondary" 
        className={cn('gap-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', className)}
      >
        <Stethoscope className="h-3 w-3" />
        Décision médicale
      </Badge>
    );
  }

  if (!canWrite && showReadOnly) {
    return (
      <Badge 
        variant="outline" 
        className={cn('gap-1 text-xs font-medium text-muted-foreground', className)}
      >
        <Lock className="h-3 w-3" />
        Lecture seule
      </Badge>
    );
  }

  return null;
}
