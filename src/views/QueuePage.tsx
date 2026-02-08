"use client";

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueueTable } from '@/components/queue/QueueTable';
import { AddToQueueDialog } from '@/components/queue/AddToQueueDialog';
import { QueueStats } from '@/components/queue/QueueStats';
import { usePatientQueue } from '@/hooks/usePatientQueue';
import { Skeleton } from '@/components/ui/skeleton';

export default function QueuePage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const {
    entries,
    loading,
    statusFilter,
    setStatusFilter,
    addEntry,
    refresh,
    stats,
  } = usePatientQueue();

  // Filter entries based on selected tab
  const filteredEntries = statusFilter === 'all' 
    ? entries 
    : statusFilter === 'active'
    ? entries.filter(e => ['present', 'waiting', 'called', 'in_consultation', 'awaiting_exam'].includes(e.status || 'waiting'))
    : entries.filter(e => e.status === statusFilter);

  // Calculate tab counts
  const activeCount = entries.filter(e => 
    ['present', 'waiting', 'called', 'in_consultation', 'awaiting_exam'].includes(e.status || 'waiting')
  ).length;
  const completedCount = entries.filter(e => ['completed', 'closed'].includes(e.status || '')).length;
  const noShowCount = entries.filter(e => e.status === 'no_show').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">File d'attente</h1>
            <p className="text-muted-foreground">
              Gérez le parcours patient dans la salle d'attente
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={loading}
              data-testid="queue-refresh-button"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} data-testid="queue-add-button">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un patient
            </Button>
          </div>
        </div>

        <QueueStats {...stats} />

        <div className="flex items-center justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="active" data-testid="queue-tab-active">
                Actifs ({activeCount})
              </TabsTrigger>
              <TabsTrigger value="waiting" data-testid="queue-tab-waiting">
                En attente ({stats.waiting})
              </TabsTrigger>
              <TabsTrigger value="in_consultation" data-testid="queue-tab-inprogress">
                En consultation ({entries.filter(e => e.status === 'in_consultation').length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="queue-tab-completed">
                Terminés ({completedCount})
              </TabsTrigger>
              <TabsTrigger value="no_show" data-testid="queue-tab-noshow">
                Absents ({noShowCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <QueueTable entries={filteredEntries} onUpdate={refresh} />
        )}
      </div>

      <AddToQueueDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={addEntry}
      />
    </DashboardLayout>
  );
}
