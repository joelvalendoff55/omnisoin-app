import { Badge } from '@/components/ui/badge';
import { FileWarning, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ValidationStatus = 'draft' | 'pending' | 'validated';

interface DraftBadgeProps {
  status?: ValidationStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<ValidationStatus, { 
  label: string; 
  icon: React.ReactNode; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  draft: {
    label: 'Brouillon',
    icon: <FileWarning className="h-3 w-3" />,
    variant: 'secondary',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  },
  pending: {
    label: 'En attente de validation',
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
  },
  validated: {
    label: 'Validé médicalement',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800',
  },
};

export function DraftBadge({ 
  status = 'draft', 
  className, 
  showLabel = true 
}: DraftBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge 
      variant={config.variant}
      className={cn('gap-1 font-medium', config.className, className)}
    >
      {config.icon}
      {showLabel && config.label}
    </Badge>
  );
}

// Alias pour usage rapide
export function NonValideBadge({ className }: { className?: string }) {
  return (
    <Badge 
      variant="secondary"
      className={cn(
        'gap-1 font-medium bg-amber-100 text-amber-800 border-amber-200',
        'dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
        className
      )}
    >
      <FileWarning className="h-3 w-3" />
      Non validé médicalement
    </Badge>
  );
}
