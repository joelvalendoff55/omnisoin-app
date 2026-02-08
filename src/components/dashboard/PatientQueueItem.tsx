import { cn } from '@/lib/utils';
import { Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientQueueItemProps {
  patientName: string;
  arrivalTime?: string;
  location?: string;
  reason?: string;
  waitingMinutes?: number;
  status?: 'urgent' | 'attention' | 'ok';
  onClick?: () => void;
}

export function PatientQueueItem({
  patientName,
  arrivalTime,
  location,
  reason,
  waitingMinutes,
  status = 'ok',
  onClick,
}: PatientQueueItemProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'urgent':
        return 'patient-item-urgent';
      case 'attention':
        return 'patient-item-attention';
      default:
        return 'patient-item';
    }
  };

  const getStatusDotClass = () => {
    switch (status) {
      case 'urgent':
        return 'status-dot-urgent';
      case 'attention':
        return 'status-dot-attention';
      default:
        return 'status-dot-ok';
    }
  };

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className={getStatusClass()} onClick={onClick}>
      <div className={getStatusDotClass()} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{patientName}</span>
          {arrivalTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3" />
              {formatTime(arrivalTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {location && <span>{location}</span>}
          {location && reason && <span>•</span>}
          {reason && <span className="truncate">{reason}</span>}
        </div>
      </div>
      {waitingMinutes !== undefined && waitingMinutes > 0 && (
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded",
          waitingMinutes > 30 ? "bg-destructive/10 text-destructive" :
          waitingMinutes > 15 ? "bg-warning/10 text-warning" :
          "bg-muted text-muted-foreground"
        )}>
          {waitingMinutes}min
        </span>
      )}
    </div>
  );
}
