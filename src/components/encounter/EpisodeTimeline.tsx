import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Circle, 
  UserCheck, 
  CheckCircle, 
  Stethoscope, 
  CheckCircle2, 
  XCircle,
  Clock
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  type EncounterStatus, 
  type EncounterStatusHistoryEntry,
  ENCOUNTER_STATUS_CONFIG 
} from '@/types/encounter';

interface EpisodeTimelineProps {
  history: EncounterStatusHistoryEntry[];
  currentStatus: EncounterStatus;
  startedAt: string;
  className?: string;
}

const iconMap = {
  Circle,
  UserCheck,
  CheckCircle,
  Stethoscope,
  CheckCircle2,
  XCircle,
};

interface TimelineItem {
  id: string;
  status: EncounterStatus;
  timestamp: string;
  label: string;
  reason?: string | null;
  previousStatus?: EncounterStatus | null;
}

export function EpisodeTimeline({ 
  history, 
  currentStatus, 
  startedAt,
  className 
}: EpisodeTimelineProps) {
  // Combine initial creation with history
  const timelineItems: TimelineItem[] = [
    {
      id: 'start',
      status: 'created' as EncounterStatus,
      timestamp: startedAt,
      label: 'Épisode créé',
    },
    ...history.map(entry => ({
      id: entry.id,
      status: entry.new_status,
      timestamp: entry.changed_at,
      label: ENCOUNTER_STATUS_CONFIG[entry.new_status].label,
      reason: entry.reason,
      previousStatus: entry.previous_status,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />

        {timelineItems.map((item, index) => {
          const config = ENCOUNTER_STATUS_CONFIG[item.status];
          const IconComponent = iconMap[config.icon as keyof typeof iconMap];
          const isLast = index === timelineItems.length - 1;
          const isCurrent = item.status === currentStatus && isLast;

          return (
            <div key={item.id} className="relative flex gap-3">
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute -left-3.5 flex items-center justify-center w-5 h-5 rounded-full border-2 bg-background',
                  isCurrent ? 'border-primary' : 'border-muted-foreground/30'
                )}
              >
                {IconComponent && (
                  <IconComponent 
                    className={cn(
                      'h-3 w-3',
                      isCurrent ? config.color : 'text-muted-foreground'
                    )} 
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2">
                  <span 
                    className={cn(
                      'font-medium text-sm',
                      isCurrent ? config.color : 'text-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Actuel
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(item.timestamp), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </div>

                {item.reason && (
                  <p className="mt-1 text-xs text-muted-foreground italic">
                    {item.reason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
