import Link from "next/link";
import { CheckSquare, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Task } from '@/lib/tasks';

interface AssistantTasksWidgetProps {
  tasks: Task[];
  loading: boolean;
}

const PRIORITY_CONFIG = {
  1: { label: 'Urgent', className: 'bg-destructive text-destructive-foreground' },
  2: { label: 'Haute', className: 'bg-warning text-warning-foreground' },
  3: { label: 'Normale', className: 'bg-secondary text-secondary-foreground' },
  4: { label: 'Basse', className: 'bg-muted text-muted-foreground' },
} as const;

export function AssistantTasksWidget({ tasks, loading }: AssistantTasksWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const urgentCount = tasks.filter((t) => t.priority <= 2).length;
  const overdueCount = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="h-5 w-5 text-primary" />
            Mes tâches
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tasks" className="gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{tasks.length}</span> en attente
          </span>
          {urgentCount > 0 && (
            <span className="text-destructive">
              <span className="font-medium">{urgentCount}</span> urgent{urgentCount > 1 ? 'es' : 'e'}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">{overdueCount}</span> en retard
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune tâche assignée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map((task) => {
                const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[3];
                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
                const isDueToday = task.due_date && isToday(new Date(task.due_date));

                return (
                  <Link
                    key={task.id}
                    to={`/tasks?task=${task.id}`}
                    className={`block p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                      isOverdue ? 'border-destructive/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.patient && (
                          <p className="text-xs text-muted-foreground truncate">
                            Patient: {task.patient.first_name} {task.patient.last_name}
                          </p>
                        )}
                      </div>
                      <Badge className={priority.className} variant="outline">
                        {priority.label}
                      </Badge>
                    </div>
                    {task.due_date && (
                      <div className={`text-xs mt-2 ${isOverdue ? 'text-destructive' : isDueToday ? 'text-warning' : 'text-muted-foreground'}`}>
                        {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
                        Échéance: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    )}
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
