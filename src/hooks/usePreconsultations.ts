"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useToast } from '@/hooks/use-toast';
import {
  Preconsultation,
  PreconsultationInsert,
  PreconsultationPriority,
  WaitingStatus,
  fetchActivePreconsultations,
  createPreconsultation,
  updatePreconsultationStatus,
  updatePreconsultationPriority,
  updatePreconsultation,
} from '@/lib/preconsultations';
import type { Json } from '@/integrations/supabase/types';

export interface UsePreconsultationsResult {
  preconsultations: Preconsultation[];
  loading: boolean;
  error: Error | null;
  stats: {
    arrived: number;
    waiting: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  create: (data: Omit<PreconsultationInsert, 'structure_id' | 'created_by'>) => Promise<Preconsultation>;
  updateStatus: (id: string, status: WaitingStatus) => Promise<void>;
  updatePriority: (id: string, priority: PreconsultationPriority) => Promise<void>;
  update: (id: string, data: { initial_symptoms?: string | null; vital_signs?: Json; notes?: string | null; assigned_to?: string | null }) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePreconsultations(): UsePreconsultationsResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const { user } = useAuth();
  const { toast } = useToast();
  const [preconsultations, setPreconsultations] = useState<Preconsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPreconsultations = useCallback(async () => {
    if (!structureId) return;

    try {
      setLoading(true);
      const data = await fetchActivePreconsultations(structureId);
      setPreconsultations(data);
      setError(null);
    } catch (err) {
      console.error('Error loading preconsultations:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  // Initial load and realtime subscription
  useEffect(() => {
    if (!structureId) return;

    loadPreconsultations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('preconsultations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preconsultations',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          loadPreconsultations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, loadPreconsultations]);

  const create = useCallback(
    async (data: Omit<PreconsultationInsert, 'structure_id' | 'created_by'>): Promise<Preconsultation> => {
      if (!structureId || !user) {
        throw new Error('Structure ou utilisateur non disponible');
      }

      try {
        const result = await createPreconsultation({
          ...data,
          structure_id: structureId,
          created_by: user.id,
        });

        toast({
          title: 'Patient enregistré',
          description: 'L\'arrivée du patient a été enregistrée avec succès.',
        });

        return result;
      } catch (err) {
        console.error('Error creating preconsultation:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'enregistrer l\'arrivée du patient.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [structureId, user, toast]
  );

  const updateStatusHandler = useCallback(
    async (id: string, status: WaitingStatus): Promise<void> => {
      try {
        await updatePreconsultationStatus(id, status);
        toast({
          title: 'Statut mis à jour',
          description: `Le statut a été changé en "${status}".`,
        });
      } catch (err) {
        console.error('Error updating status:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le statut.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  const updatePriorityHandler = useCallback(
    async (id: string, priority: PreconsultationPriority): Promise<void> => {
      try {
        await updatePreconsultationPriority(id, priority);
        toast({
          title: 'Priorité mise à jour',
          description: `La priorité a été changée en "${priority}".`,
        });
      } catch (err) {
        console.error('Error updating priority:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour la priorité.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  const updateHandler = useCallback(
    async (
      id: string,
      data: { initial_symptoms?: string | null; vital_signs?: Json; notes?: string | null; assigned_to?: string | null }
    ): Promise<void> => {
      try {
        await updatePreconsultation(id, data);
        toast({
          title: 'Mise à jour effectuée',
          description: 'Les informations ont été mises à jour.',
        });
      } catch (err) {
        console.error('Error updating preconsultation:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour les informations.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast]
  );

  // Compute stats
  const stats = {
    arrived: preconsultations.filter((p) => p.waiting_status === 'arrived').length,
    waiting: preconsultations.filter((p) => p.waiting_status === 'waiting').length,
    inProgress: preconsultations.filter((p) => p.waiting_status === 'in_progress').length,
    completed: preconsultations.filter((p) => p.waiting_status === 'completed').length,
    total: preconsultations.length,
  };

  return {
    preconsultations,
    loading: loading || structureLoading,
    error,
    stats,
    create,
    updateStatus: updateStatusHandler,
    updatePriority: updatePriorityHandler,
    update: updateHandler,
    refresh: loadPreconsultations,
  };
}
