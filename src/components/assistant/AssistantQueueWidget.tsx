import Link from "next/link";
import { Users, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { QueueEntry } from '@/lib/queue';

interface AssistantQueueWidgetProps {
  entries: QueueEntry[];
  loading: boolean;
}

const PRIORITY_CONFIG = {
  1: { label: 'Urgent', className: 'bg-destructive text-destructive-foreground' },
  2: { label: 'Prioritaire', className: 'bg-warning text-warning-foreground' },
  3: { label: 'Normal', className: 'bg-secondary text-secondary-foreground' },
} as const;

const STATUS_CONFIG = {
  present: { label: 'Présent', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  waiting: { label: 'En attente', className: 'bg-muted text-muted-foreground' },
  called: { label: 'Appelé', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_consultation: { label: 'En consultation', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  awaiting_exam: { label: 'Attente examen', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
} as const;

export function AssistantQueueWidget({ entries, loading }: AssistantQueueWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const waitingCount = entries.filter((e) => e.status === 'waiting' || e.status === 'present').length;
  const inProgressCount = entries.filter((e) => e.status === 'in_consultation' || e.status === 'called' || e.status === 'awaiting_exam').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            File d'attente du jour
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/queue" className="gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{waitingCount}</span> en attente
          </span>
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{inProgressCount}</span> en cours
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun patient en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 8).map((entry) => {
                const priority = PRIORITY_CONFIG[entry.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[3];
                const status = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.waiting;

                return (
                  <Link
                    key={entry.id}
                    to={`/queue?entry=${entry.id}`}
                    className="block p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.patient?.first_name} {entry.patient?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.reason || entry.consultation_reason?.label || 'Non précisé'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={priority.className} variant="outline">
                          {priority.label}
                        </Badge>
                        <Badge className={status.className} variant="outline">
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(entry.arrival_time), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
