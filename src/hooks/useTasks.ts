import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import {
  Task,
  TaskInsert,
  TaskFilters,
  fetchTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from '@/lib/tasks';
import { createNotification } from '@/lib/notifications';

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  addTask: (task: Omit<TaskInsert, 'structure_id' | 'created_by'>) => Promise<void>;
  editTask: (id: string, updates: Partial<Task>) => Promise<void>;
  complete: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({ status: 'pending' });

  const loadTasks = useCallback(async () => {
    if (!structureId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchTasks(structureId, filters);
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }, [structureId, filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Realtime subscription with notification for assigned tasks
  useEffect(() => {
    if (!structureId || !user) return;

    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `structure_id=eq.${structureId}`,
        },
        async (payload) => {
          // Check if a task was assigned to current user
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTask = payload.new as Task;
            const oldTask = payload.old as Task | undefined;
            
            // Get current user's team member ID
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('id, user_id')
              .eq('user_id', user.id)
              .eq('structure_id', structureId)
              .maybeSingle();

            if (teamMember && newTask.assigned_to === teamMember.id) {
              // Check if it's a new assignment (not already assigned to this user)
              if (!oldTask || oldTask.assigned_to !== teamMember.id) {
                // Create notification for assigned task
                try {
                  await createNotification(
                    user.id,
                    structureId,
                    'Nouvelle tâche assignée',
                    newTask.title,
                    'task',
                    '/tasks'
                  );
                } catch (notifError) {
                  console.error('Error creating task notification:', notifError);
                }
                
                toast({
                  title: 'Nouvelle tâche assignée',
                  description: newTask.title,
                });
              }
            }
          }
          
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, user, loadTasks, toast]);

  const addTask = async (task: Omit<TaskInsert, 'structure_id' | 'created_by'>) => {
    if (!structureId || !user) {
      toast({
        title: 'Erreur',
        description: 'Structure ou utilisateur non défini',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTask({
        ...task,
        structure_id: structureId,
        created_by: user.id,
      });
      toast({
        title: 'Tâche créée',
        description: 'La tâche a été créée avec succès',
      });
      await loadTasks();
    } catch (err) {
      console.error('Error creating task:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la tâche',
        variant: 'destructive',
      });
    }
  };

  const editTask = async (id: string, updates: Partial<Task>) => {
    try {
      await updateTask(id, updates);
      toast({
        title: 'Tâche mise à jour',
        description: 'La tâche a été mise à jour',
      });
      await loadTasks();
    } catch (err) {
      console.error('Error updating task:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la tâche',
        variant: 'destructive',
      });
    }
  };

  const complete = async (id: string) => {
    try {
      await completeTask(id);
      toast({
        title: 'Tâche terminée',
        description: 'La tâche a été marquée comme terminée',
      });
      await loadTasks();
    } catch (err) {
      console.error('Error completing task:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de terminer la tâche',
        variant: 'destructive',
      });
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteTask(id);
      toast({
        title: 'Tâche supprimée',
        description: 'La tâche a été supprimée',
      });
      await loadTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la tâche',
        variant: 'destructive',
      });
    }
  };

  return {
    tasks,
    loading,
    error,
    filters,
    setFilters,
    addTask,
    editTask,
    complete,
    remove,
    refresh: loadTasks,
  };
}
