"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckSquare,
  Sparkles,
  Loader2,
  Calendar,
  Mail,
  FileText,
  ClipboardList,
  User,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GeneratedTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'rdv' | 'courrier' | 'ordonnance' | 'administratif' | 'patient';
  completed: boolean;
}

interface AssistantGeneratedTasksProps {
  anamnesis: string;
  patientId?: string;
  transcriptId?: string;
  onTasksGenerated?: (tasks: GeneratedTask[]) => void;
}

const PRIORITY_CONFIG = {
  high: { label: 'Urgent', className: 'bg-destructive text-destructive-foreground' },
  medium: { label: 'Moyen', className: 'bg-warning text-warning-foreground' },
  low: { label: 'Faible', className: 'bg-muted text-muted-foreground' },
};

const CATEGORY_ICONS = {
  rdv: Calendar,
  courrier: Mail,
  ordonnance: FileText,
  administratif: ClipboardList,
  patient: User,
};

const STORAGE_KEY = 'assistant_generated_tasks';

function getStorageKey(patientId?: string, transcriptId?: string): string {
  if (transcriptId) return `${STORAGE_KEY}_transcript_${transcriptId}`;
  if (patientId) return `${STORAGE_KEY}_patient_${patientId}`;
  return `${STORAGE_KEY}_session`;
}

export function AssistantGeneratedTasks({
  anamnesis,
  patientId,
  transcriptId,
  onTasksGenerated,
}: AssistantGeneratedTasksProps) {
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const storageKey = getStorageKey(patientId, transcriptId);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem(storageKey);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        setTasks(parsed);
        setHasGenerated(true);
      } catch (e) {
        console.error('Error parsing saved tasks:', e);
      }
    }
  }, [storageKey]);

  // Save tasks to localStorage when they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [tasks, storageKey]);

  const handleGenerateTasks = async () => {
    if (!anamnesis.trim()) {
      toast.error('Aucune anamnèse disponible pour générer des tâches');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-assistant-tasks', {
        body: {
          anamnesis,
          patientId,
          transcriptId,
        },
      });

      if (error) throw error;

      if (data?.tasks && Array.isArray(data.tasks)) {
        const generatedTasks: GeneratedTask[] = data.tasks.map((task: any, index: number) => ({
          id: `task_${Date.now()}_${index}`,
          title: task.title || 'Tâche sans titre',
          priority: task.priority || 'medium',
          category: task.category || 'administratif',
          completed: false,
        }));

        setTasks(generatedTasks);
        setHasGenerated(true);
        onTasksGenerated?.(generatedTasks);
        toast.success(`${generatedTasks.length} tâches générées`);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      console.error('Error generating tasks:', err);
      toast.error('Erreur lors de la génération des tâches');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleRegenerate = () => {
    setTasks([]);
    localStorage.removeItem(storageKey);
    handleGenerateTasks();
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  // Don't show if no anamnesis
  if (!anamnesis.trim()) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Tâches à accomplir
          </div>
          {hasGenerated && tasks.length > 0 && (
            <Badge variant="outline" className="font-normal">
              {completedCount}/{tasks.length} terminées
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasGenerated ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Générez automatiquement une liste de tâches administratives à partir de l'anamnèse
            </p>
            <Button
              onClick={handleGenerateTasks}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer les tâches
                </>
              )}
            </Button>
          </div>
        ) : isGenerating ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Aucune tâche générée</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTasks}
              className="mt-2 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {tasks.map((task) => {
                  const Icon = CATEGORY_ICONS[task.category] || ClipboardList;
                  const priorityConfig = PRIORITY_CONFIG[task.priority];

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border bg-card transition-all',
                        task.completed && 'opacity-60 bg-muted/50'
                      )}
                    >
                      <Checkbox
                        id={task.id}
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={task.id}
                          className={cn(
                            'text-sm font-medium cursor-pointer block',
                            task.completed && 'line-through text-muted-foreground'
                          )}
                        >
                          {task.title}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <Badge className={cn('text-xs', priorityConfig.className)} variant="outline">
                            {priorityConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                className="gap-2 text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" />
                Régénérer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
