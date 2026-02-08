"use client";

import { useEffect, useState } from 'react';
import Link from "next/link";
import { AlertTriangle, Clock, ChevronRight, CheckSquare, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow, isPast, isToday, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UrgentTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: number;
  patient_name: string | null;
  is_overdue: boolean;
  is_due_today: boolean;
}

const PRIORITY_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: 'Critique', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  2: { label: 'Haute', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  3: { label: 'Normale', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  4: { label: 'Basse', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

export function UrgentTasksWidget() {
  const { structureId, loading: structureLoading } = useStructureId();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UrgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (structureLoading || !structureId || !user) return;

    const fetchUrgentTasks = async () => {
      setLoading(true);
      try {
        // Get team member ID for the current user
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .maybeSingle();

        // Fetch overdue and high priority tasks
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            due_date,
            priority,
            patient:patients(first_name, last_name)
          `)
          .eq('structure_id', structureId)
          .in('status', ['pending', 'in_progress'])
          .not('due_date', 'is', null)
          .or(`priority.lte.2,due_date.lte.${new Date().toISOString()}`)
          .order('due_date', { ascending: true })
          .limit(10);

        if (error) throw error;

        const now = new Date();
        const urgentTasks: UrgentTask[] = (data || []).map((task: any) => {
          const dueDate = new Date(task.due_date);
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority || 3,
            patient_name: task.patient 
              ? `${task.patient.first_name} ${task.patient.last_name}` 
              : null,
            is_overdue: isPast(dueDate) && !isToday(dueDate),
            is_due_today: isToday(dueDate),
          };
        });

        // Sort: overdue first, then by priority, then by due date
        urgentTasks.sort((a, b) => {
          if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
          if (a.priority !== b.priority) return a.priority - b.priority;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        setTasks(urgentTasks);
      } catch (error) {
        console.error('Error fetching urgent tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUrgentTasks();
  }, [structureId, structureLoading, user]);

  const overdueCount = tasks.filter((t) => t.is_overdue).length;
  const todayCount = tasks.filter((t) => t.is_due_today).length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Tâches urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(overdueCount > 0 && 'border-destructive/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className={cn(
              'h-5 w-5',
              overdueCount > 0 ? 'text-destructive animate-pulse' : 'text-warning'
            )} />
            Tâches urgentes
            {overdueCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {overdueCount} en retard
              </Badge>
            )}
            {todayCount > 0 && overdueCount === 0 && (
              <Badge variant="outline" className="border-warning text-warning">
                {todayCount} aujourd'hui
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/tasks">Voir toutes</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune tâche urgente</p>
            <p className="text-xs mt-1">Tout est à jour !</p>
          </div>
        ) : (
          <ScrollArea className="h-[240px] pr-2">
            <div className="space-y-2">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks?task=${task.id}`}
                  className={cn(
                    'block p-3 rounded-lg border transition-colors group',
                    task.is_overdue 
                      ? 'bg-destructive/5 border-destructive/30 hover:bg-destructive/10' 
                      : task.is_due_today
                        ? 'bg-warning/5 border-warning/30 hover:bg-warning/10'
                        : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={cn('text-[10px] px-1.5', PRIORITY_CONFIG[task.priority]?.className)}
                        >
                          {PRIORITY_CONFIG[task.priority]?.label || 'Normal'}
                        </Badge>
                        {task.is_overdue && (
                          <Badge variant="destructive" className="text-[10px] px-1.5">
                            En retard
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{task.title}</p>
                      {task.patient_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          Patient: {task.patient_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className={cn(
                      task.is_overdue && 'text-destructive font-medium',
                      task.is_due_today && 'text-warning font-medium'
                    )}>
                      {task.is_overdue 
                        ? `En retard de ${formatDistanceToNow(new Date(task.due_date), { locale: fr })}`
                        : task.is_due_today
                          ? `Aujourd'hui à ${format(new Date(task.due_date), 'HH:mm')}`
                          : format(new Date(task.due_date), 'dd MMM à HH:mm', { locale: fr })
                      }
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
