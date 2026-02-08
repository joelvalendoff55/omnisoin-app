"use client";

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from "next/link";
import { Calendar, User, CheckCircle, Clock, AlertTriangle, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task, getPriorityInfo, getCategoryInfo, isOverdue } from '@/lib/tasks';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onComplete, onEdit, onDelete }: TaskCardProps) {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const priorityInfo = getPriorityInfo(task.priority);
  const categoryInfo = getCategoryInfo(task.category);
  const overdue = isOverdue(task.due_date) && task.status !== 'completed' && task.status !== 'cancelled';

  const canDelete = isAdmin || task.created_by === user?.id;

  const getPriorityBadgeVariant = (priority: number) => {
    switch (priority) {
      case 1:
        return 'destructive';
      case 2:
        return 'default';
      case 3:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En cours</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Terminée</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Annulée</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card
      data-testid="task-card"
      className={`transition-all ${
        task.status === 'completed' || task.status === 'cancelled'
          ? 'opacity-60'
          : overdue
          ? 'border-destructive/50 bg-destructive/5'
          : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={getPriorityBadgeVariant(task.priority)}>
                {priorityInfo.label}
              </Badge>
              {getStatusBadge(task.status)}
              {categoryInfo && (
                <Badge variant="outline">{categoryInfo.label}</Badge>
              )}
              {overdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  En retard
                </Badge>
              )}
            </div>

            <h3 className="font-semibold text-lg">{task.title}</h3>

            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
              {task.patient && (
                <Link
                  to={`/patients/${task.patient.id}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>{task.patient.first_name} {task.patient.last_name}</span>
                </Link>
              )}

              {task.assigned_team_member && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{task.assigned_team_member.job_title}</span>
                </div>
              )}

              {task.due_date && (
                <div className={`flex items-center gap-1 ${overdue ? 'text-destructive' : ''}`}>
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              )}

              {task.status === 'completed' && task.completed_at && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Terminée le {format(new Date(task.completed_at), 'dd MMM', { locale: fr })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onComplete(task.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Terminer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(task)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              </>
            )}

            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
