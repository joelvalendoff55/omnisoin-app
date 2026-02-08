import { ReactNode } from 'react';
import { useCanWriteField, useIsMedicalDecisionField } from '@/hooks/useFieldPermissions';
import { MedicalFieldBadge } from './MedicalFieldBadge';
import { cn } from '@/lib/utils';

interface ProtectedMedicalFieldProps {
  tableName: string;
  fieldName: string;
  label: string;
  children: ReactNode;
  className?: string;
  description?: string;
}

export function ProtectedMedicalField({
  tableName,
  fieldName,
  label,
  children,
  className,
  description,
}: ProtectedMedicalFieldProps) {
  const canWrite = useCanWriteField(tableName, fieldName);
  const isMedicalDecision = useIsMedicalDecisionField(tableName, fieldName);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        <MedicalFieldBadge 
          tableName={tableName} 
          fieldName={fieldName} 
        />
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div 
        className={cn(
          !canWrite && 'opacity-60 pointer-events-none',
          isMedicalDecision && !canWrite && 'border-2 border-destructive/20 rounded-md p-2 bg-destructive/5'
        )}
      >
        {children}
      </div>
      
      {isMedicalDecision && !canWrite && (
        <p className="text-xs text-destructive">
          ⚠️ Ce champ contient une décision médicale. Seul un médecin peut le modifier.
        </p>
      )}
    </div>
  );
}
