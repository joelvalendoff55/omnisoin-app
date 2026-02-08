"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskFiltersComponent } from '@/components/tasks/TaskFilters';
import { useTasks } from '@/hooks/useTasks';
import { Task, fetchTaskById } from '@/lib/tasks';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const {
    tasks,
    loading,
    filters,
    setFilters,
    addTask,
    editTask,
    complete,
    remove,
    refresh,
  } = useTasks();

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingTask(null);
    }
  };

  // Handle openTask query param from GlobalSearch
  useEffect(() => {
    const openTaskId = searchParams.get('openTask');
    if (openTaskId && !loading && tasks.length > 0) {
      const found = tasks.find((t) => t.id === openTaskId);
      if (found) {
        // Open task in edit mode
        setEditingTask(found);
        setFormOpen(true);
      } else {
        // Try to fetch directly if not in list (might be filtered out)
        fetchTaskById(openTaskId).then((task) => {
          if (task) {
            setEditingTask(task);
            setFormOpen(true);
          }
        });
      }
      // Clean URL
      setSearchParams((params) => {
        params.delete('openTask');
        return params;
      }, { replace: true });
    }
  }, [searchParams, loading, tasks, setSearchParams]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tâches</h1>
            <p className="text-muted-foreground">
              Gérez et suivez les tâches de l'équipe
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setFormOpen(true)} data-testid="task-create-button">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle tâche
            </Button>
          </div>
        </div>

        <TaskFiltersComponent filters={filters} onFiltersChange={setFilters} />

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">
              Aucune tâche trouvée avec ces filtres
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={complete}
                onEdit={handleEdit}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </div>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        task={editingTask}
        onSubmit={addTask}
        onUpdate={editTask}
      />
    </DashboardLayout>
  );
}
