"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import {
  QueueEntry,
  QueueEntryInsert,
  fetchQueue,
  addToQueue,
  updateQueueEntry,
  callPatient,
  completePatient,
  cancelPatient,
  removeFromQueue,
} from '@/lib/queue';

interface UsePatientQueueResult {
  entries: QueueEntry[];
  loading: boolean;
  error: Error | null;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  addEntry: (entry: Omit<QueueEntryInsert, 'structure_id'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<QueueEntry>) => Promise<void>;
  callEntry: (id: string, assignedTo?: string) => Promise<void>;
  completeEntry: (id: string) => Promise<void>;
  cancelEntry: (id: string) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  stats: {
    waiting: number;
    inProgress: number;
    completedToday: number;
    averageWaitTime: number;
  };
}

export function usePatientQueue(): UsePatientQueueResult {
  const { structureId } = useStructureId();
  const { toast } = useToast();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('waiting');

  const loadQueue = useCallback(async () => {
    if (!structureId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchQueue(structureId, statusFilter === 'all' ? undefined : statusFilter);
      setEntries(data);
      setError(null);
    } catch (err) {
      console.error('Error loading queue:', err);
      setError(err instanceof Error ? err : new Error('Failed to load queue'));
    } finally {
      setLoading(false);
    }
  }, [structureId, statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Realtime subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('patient_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          // Refresh the queue on any change
          loadQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, loadQueue]);

  const addEntry = async (entry: Omit<QueueEntryInsert, 'structure_id'>) => {
    if (!structureId) {
      toast({
        title: 'Erreur',
        description: 'Structure non définie',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addToQueue({ ...entry, structure_id: structureId });
      toast({
        title: 'Patient ajouté',
        description: 'Le patient a été ajouté à la file d\'attente',
      });
      await loadQueue();
    } catch (err) {
      console.error('Error adding to queue:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le patient à la file',
        variant: 'destructive',
      });
    }
  };

  const updateEntry = async (id: string, updates: Partial<QueueEntry>) => {
    try {
      await updateQueueEntry(id, updates);
      await loadQueue();
    } catch (err) {
      console.error('Error updating queue entry:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'entrée',
        variant: 'destructive',
      });
    }
  };

  const callEntry = async (id: string, assignedTo?: string) => {
    try {
      await callPatient(id, assignedTo);
      toast({
        title: 'Patient appelé',
        description: 'Le patient a été appelé',
      });
      await loadQueue();
    } catch (err) {
      console.error('Error calling patient:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appeler le patient',
        variant: 'destructive',
      });
    }
  };

  const completeEntry = async (id: string) => {
    try {
      await completePatient(id);
      toast({
        title: 'Consultation terminée',
        description: 'Le patient a été marqué comme terminé',
      });
      await loadQueue();
    } catch (err) {
      console.error('Error completing patient:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de terminer la consultation',
        variant: 'destructive',
      });
    }
  };

  const cancelEntry = async (id: string) => {
    try {
      await cancelPatient(id);
      toast({
        title: 'Entrée annulée',
        description: 'L\'entrée a été annulée',
      });
      await loadQueue();
    } catch (err) {
      console.error('Error cancelling entry:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'annuler l\'entrée',
        variant: 'destructive',
      });
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await removeFromQueue(id);
      toast({
        title: 'Entrée supprimée',
        description: 'L\'entrée a été supprimée de la file',
      });
      await loadQueue();
    } catch (err) {
      console.error('Error removing entry:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'entrée',
        variant: 'destructive',
      });
    }
  };

  // Calculate stats
  const stats = {
    waiting: entries.filter(e => e.status === 'waiting').length,
    inProgress: entries.filter(e => e.status === 'in_consultation').length,
    completedToday: entries.filter(e => {
      if (e.status !== 'completed' || !e.completed_at) return false;
      const completedDate = new Date(e.completed_at).toDateString();
      const today = new Date().toDateString();
      return completedDate === today;
    }).length,
    averageWaitTime: (() => {
      const waitingEntries = entries.filter(e => e.status === 'waiting');
      if (waitingEntries.length === 0) return 0;
      
      const totalMinutes = waitingEntries.reduce((sum, entry) => {
        const arrival = new Date(entry.arrival_time);
        const now = new Date();
        return sum + Math.floor((now.getTime() - arrival.getTime()) / 60000);
      }, 0);
      
      return Math.round(totalMinutes / waitingEntries.length);
    })(),
  };

  return {
    entries,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    addEntry,
    updateEntry,
    callEntry,
    completeEntry,
    cancelEntry,
    removeEntry,
    refresh: loadQueue,
    stats,
  };
}
