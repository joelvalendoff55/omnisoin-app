import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, CheckCircle, Calendar, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Task, fetchTasksByPatient, fetchTasksByTeamMember, getPriorityInfo, isOverdue, completeTask } from '@/lib/tasks';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { useToast } from '@/hooks/use-toast';

interface PatientTasksListProps {
  patientId: string;
  onTaskAdded?: () => void;
}

export function PatientTasksList({ patientId, onTaskAdded }: PatientTasksListProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasksByPatient(patientId);
      setTasks(data);
    } catch (err) {
      console.error('Error loading patient tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [patientId]);

  const handleComplete = async (id: string) => {
    try {
      await completeTask(id);
      toast({ title: 'Tâche terminée' });
      loadTasks();
    } catch (err) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleAddTask = async (data: any) => {
    // The parent will handle this via the TaskFormDialog
    loadTasks();
    onTaskAdded?.();
  };

  const getPriorityBadgeVariant = (priority: number) => {
    switch (priority) {
      case 1: return 'destructive';
      case 2: return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Tâches
            </CardTitle>
            <CardDescription>Tâches liées à ce patient</CardDescription>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>Aucune tâche</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => {
              const overdue = isOverdue(task.due_date) && task.status !== 'completed';
              const priorityInfo = getPriorityInfo(task.priority);

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    task.status === 'completed' ? 'opacity-60' : overdue ? 'border-destructive/50 bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                        {priorityInfo.label}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          En retard
                        </Badge>
                      )}
                    </div>
                    <p className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <Button size="sm" variant="ghost" onClick={() => handleComplete(task.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {tasks.length > 5 && (
              <Link
                to={`/tasks?patient_id=${patientId}`}
                className="block text-center text-sm text-primary hover:underline py-2"
              >
                Voir les {tasks.length - 5} autres tâches
              </Link>
            )}
          </div>
        )}
      </CardContent>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultPatientId={patientId}
        onSubmit={handleAddTask}
      />
    </Card>
  );
}

interface TeamMemberTasksListProps {
  teamMemberId: string;
}

export function TeamMemberTasksList({ teamMemberId }: TeamMemberTasksListProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasksByTeamMember(teamMemberId);
      setTasks(data);
    } catch (err) {
      console.error('Error loading team member tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [teamMemberId]);

  const handleComplete = async (id: string) => {
    try {
      await completeTask(id);
      toast({ title: 'Tâche terminée' });
      loadTasks();
    } catch (err) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const getPriorityBadgeVariant = (priority: number) => {
    switch (priority) {
      case 1: return 'destructive';
      case 2: return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Aucune tâche assignée</p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.slice(0, 5).map((task) => {
        const overdue = isOverdue(task.due_date);
        const priorityInfo = getPriorityInfo(task.priority);

        return (
          <div
            key={task.id}
            className={`flex items-center justify-between p-2 border rounded-lg text-sm ${
              overdue ? 'border-destructive/50 bg-destructive/5' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                  {priorityInfo.label}
                </Badge>
                <span className="truncate">{task.title}</span>
              </div>
              {task.patient && (
                <p className="text-xs text-muted-foreground mt-1">
                  <User className="h-3 w-3 inline mr-1" />
                  {task.patient.first_name} {task.patient.last_name}
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleComplete(task.id)}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      {tasks.length > 5 && (
        <p className="text-xs text-muted-foreground">
          +{tasks.length - 5} autres tâches
        </p>
      )}
    </div>
  );
}
