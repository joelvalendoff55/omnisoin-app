import { Clock, Phone, UserCheck, XCircle, PlayCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueueEntry, getWaitingTime, getPriorityInfo } from '@/lib/queue';
import { useRole } from '@/hooks/useRole';

interface QueueEntryCardProps {
  entry: QueueEntry;
  onCall: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

export function QueueEntryCard({
  entry,
  onCall,
  onComplete,
  onCancel,
  onRemove,
}: QueueEntryCardProps) {
  const { isAdmin } = useRole();
  const waitingTime = getWaitingTime(entry.arrival_time);
  const priorityInfo = getPriorityInfo(entry.priority);

  const patientName = entry.patient
    ? `${entry.patient.first_name} ${entry.patient.last_name}`
    : 'Patient inconnu';

  const getPriorityBadgeVariant = (priority: number) => {
    switch (priority) {
      case 1:
        return 'destructive';
      case 2:
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Présent</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>;
      case 'called':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Appelé</Badge>;
      case 'in_consultation':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">En consultation</Badge>;
      case 'awaiting_exam':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Attente examen</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Terminé</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Clôturé</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Annulé</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Absent</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card 
      data-testid="queue-entry-card"
      className={`transition-all ${
        entry.status === 'in_consultation' 
          ? 'border-primary bg-primary/5' 
          : entry.status === 'completed' || entry.status === 'cancelled' || entry.status === 'closed'
          ? 'opacity-60'
          : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={getPriorityBadgeVariant(entry.priority)}>
                {priorityInfo.label}
              </Badge>
              {getStatusBadge(entry.status)}
            </div>

            <h3 className="font-semibold text-lg truncate">{patientName}</h3>

            {entry.reason && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {entry.reason}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{waitingTime.formatted}</span>
              </div>

              {entry.patient?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{entry.patient.phone}</span>
                </div>
              )}

              {entry.assigned_team_member && (
                <div className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4" />
                  <span>{entry.assigned_team_member.job_title}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {entry.status === 'waiting' && (
              <Button
                size="sm"
                onClick={() => onCall(entry.id)}
                data-testid="queue-call-button"
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Appeler
              </Button>
            )}

            {entry.status === 'in_consultation' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onComplete(entry.id)}
                data-testid="queue-complete-button"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Terminer
              </Button>
            )}

            {(entry.status === 'waiting' || entry.status === 'in_consultation') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(entry.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            )}

            {isAdmin && (entry.status === 'completed' || entry.status === 'cancelled') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemove(entry.id)}
              >
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
