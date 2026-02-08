import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserCheck, UserX, Clock, Archive } from 'lucide-react';

interface PatientStatusBadgeProps {
  isArchived?: boolean;
  hasAssignment?: boolean;
  isInQueue?: boolean;
  className?: string;
}

export function PatientStatusBadge({ 
  isArchived, 
  hasAssignment, 
  isInQueue,
  className 
}: PatientStatusBadgeProps) {
  if (isArchived) {
    return (
      <Badge 
        variant="secondary" 
        className={cn("gap-1 text-xs bg-muted text-muted-foreground", className)}
      >
        <Archive className="h-3 w-3" />
        Archivé
      </Badge>
    );
  }

  if (isInQueue) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 text-xs border-warning/50 bg-warning/10 text-warning", className)}
      >
        <Clock className="h-3 w-3" />
        En attente
      </Badge>
    );
  }

  if (hasAssignment) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 text-xs border-success/50 bg-success/10 text-success", className)}
      >
        <UserCheck className="h-3 w-3" />
        Actif
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1 text-xs border-muted-foreground/30 text-muted-foreground", className)}
    >
      <UserX className="h-3 w-3" />
      Non assigné
    </Badge>
  );
}
