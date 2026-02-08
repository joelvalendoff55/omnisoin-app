import { Calendar, AlertTriangle, Pill, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInMonths } from 'date-fns';

interface PatientStatusIndicatorsProps {
  lastVisitDate?: string | null;
  hasUpcomingAppointment?: boolean;
  hasPrescriptionToRenew?: boolean;
  hasImportantHistory?: boolean;
  allergies?: string[];
  compact?: boolean;
}

export function PatientStatusIndicators({
  lastVisitDate,
  hasUpcomingAppointment = false,
  hasPrescriptionToRenew = false,
  hasImportantHistory = false,
  allergies = [],
  compact = false,
}: PatientStatusIndicatorsProps) {
  // Calculate visit status
  const getVisitStatus = () => {
    if (!lastVisitDate) return { status: 'unknown', label: 'Jamais vu', color: 'text-muted-foreground' };
    
    const lastVisit = new Date(lastVisitDate);
    const monthsAgo = differenceInMonths(new Date(), lastVisit);
    
    if (monthsAgo < 1) {
      return { status: 'recent', label: 'Vu récemment', color: 'text-success' };
    } else if (monthsAgo < 3) {
      return { status: 'moderate', label: `Vu il y a ${monthsAgo} mois`, color: 'text-success' };
    } else if (monthsAgo < 6) {
      return { status: 'attention', label: `Vu il y a ${monthsAgo} mois`, color: 'text-warning' };
    } else {
      return { status: 'overdue', label: `Vu il y a ${monthsAgo} mois`, color: 'text-destructive' };
    }
  };

  const visitStatus = getVisitStatus();

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {/* Visit status dot */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "w-2 h-2 rounded-full",
                visitStatus.status === 'recent' && "bg-success",
                visitStatus.status === 'moderate' && "bg-success",
                visitStatus.status === 'attention' && "bg-warning",
                visitStatus.status === 'overdue' && "bg-destructive",
                visitStatus.status === 'unknown' && "bg-muted-foreground"
              )}
            />
          </TooltipTrigger>
          <TooltipContent>{visitStatus.label}</TooltipContent>
        </Tooltip>

        {hasUpcomingAppointment && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Calendar className="h-3 w-3 text-primary" />
            </TooltipTrigger>
            <TooltipContent>RDV à venir</TooltipContent>
          </Tooltip>
        )}

        {hasPrescriptionToRenew && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Pill className="h-3 w-3 text-warning" />
            </TooltipTrigger>
            <TooltipContent>Ordonnance à renouveler</TooltipContent>
          </Tooltip>
        )}

        {hasImportantHistory && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3 w-3 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              {allergies.length > 0 
                ? `Allergies: ${allergies.join(', ')}`
                : 'ATCD importants'
              }
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Last visit badge */}
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs",
          visitStatus.status === 'recent' && "border-success/30 bg-success/10 text-success",
          visitStatus.status === 'moderate' && "border-success/30 bg-success/10 text-success",
          visitStatus.status === 'attention' && "border-warning/30 bg-warning/10 text-warning",
          visitStatus.status === 'overdue' && "border-destructive/30 bg-destructive/10 text-destructive",
          visitStatus.status === 'unknown' && "border-border bg-muted text-muted-foreground"
        )}
      >
        <Clock className="h-3 w-3 mr-1" />
        {visitStatus.label}
      </Badge>

      {hasUpcomingAppointment && (
        <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary">
          <Calendar className="h-3 w-3 mr-1" />
          RDV prévu
        </Badge>
      )}

      {hasPrescriptionToRenew && (
        <Badge variant="outline" className="text-xs border-warning/30 bg-warning/10 text-warning">
          <Pill className="h-3 w-3 mr-1" />
          Renouvellement
        </Badge>
      )}

      {hasImportantHistory && (
        <Badge variant="outline" className="text-xs border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {allergies.length > 0 ? 'Allergies' : 'ATCD'}
        </Badge>
      )}
    </div>
  );
}

// Badge for last visit status (colored based on recency)
interface LastVisitBadgeProps {
  lastVisitDate?: string | null;
}

export function LastVisitBadge({ lastVisitDate }: LastVisitBadgeProps) {
  if (!lastVisitDate) {
    return (
      <span className="text-xs text-muted-foreground">Jamais vu</span>
    );
  }

  const lastVisit = new Date(lastVisitDate);
  const monthsAgo = differenceInMonths(new Date(), lastVisit);
  const daysAgo = differenceInDays(new Date(), lastVisit);

  let label: string;
  let colorClass: string;

  if (daysAgo < 7) {
    label = 'Cette semaine';
    colorClass = 'text-success';
  } else if (monthsAgo < 1) {
    label = 'Ce mois';
    colorClass = 'text-success';
  } else if (monthsAgo < 3) {
    label = `${monthsAgo} mois`;
    colorClass = 'text-success';
  } else if (monthsAgo < 6) {
    label = `${monthsAgo} mois`;
    colorClass = 'text-warning';
  } else {
    label = `${monthsAgo} mois`;
    colorClass = 'text-destructive';
  }

  return (
    <span className={cn("text-xs font-medium", colorClass)}>
      {label}
    </span>
  );
}
