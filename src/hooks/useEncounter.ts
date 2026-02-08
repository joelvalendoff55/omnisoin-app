"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useToast } from '@/hooks/use-toast';
import { useStructureId } from '@/hooks/useStructureId';
import type { 
  Encounter, 
  EncounterWithRelations, 
  EncounterStatus, 
  EncounterMode,
  EncounterStatusHistoryEntry 
} from '@/types/encounter';

interface UseEncounterResult {
  encounter: EncounterWithRelations | null;
  loading: boolean;
  error: Error | null;
  statusHistory: EncounterStatusHistoryEntry[];
  updateStatus: (newStatus: EncounterStatus, reason?: string) => Promise<void>;
  updateMode: (newMode: EncounterMode) => Promise<void>;
  linkConsultation: (consultationId: string) => Promise<void>;
  linkPreconsultation: (preconsultationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useEncounter(encounterId: string | undefined): UseEncounterResult {
  const { toast } = useToast();
  const [encounter, setEncounter] = useState<EncounterWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusHistory, setStatusHistory] = useState<EncounterStatusHistoryEntry[]>([]);

  const fetchEncounter = useCallback(async () => {
    if (!encounterId) {
      setEncounter(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch encounter with relations
      const { data, error: fetchError } = await supabase
        .from('encounters')
        .select(`
          *,
          patient:patients(id, first_name, last_name, dob, sex),
          assigned_practitioner:team_members!encounters_assigned_practitioner_id_fkey(id, job_title, user_id),
          assigned_assistant:team_members!encounters_assigned_assistant_id_fkey(id, job_title, user_id),
          queue_entry:patient_queue(id, status, priority, arrival_time, reason)
        `)
        .eq('id', encounterId)
        .single();

      if (fetchError) throw fetchError;
      
      setEncounter(data as unknown as EncounterWithRelations);
      setError(null);

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('encounter_status_history')
        .select('*')
        .eq('encounter_id', encounterId)
        .order('changed_at', { ascending: false });

      if (!historyError && historyData) {
        setStatusHistory(historyData as unknown as EncounterStatusHistoryEntry[]);
      }
    } catch (err) {
      console.error('Error fetching encounter:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch encounter'));
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    fetchEncounter();
  }, [fetchEncounter]);

  // Realtime subscription
  useEffect(() => {
    if (!encounterId) return;

    const channel = supabase
      .channel(`encounter_${encounterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'encounters',
          filter: `id=eq.${encounterId}`,
        },
        () => {
          fetchEncounter();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'encounter_status_history',
          filter: `encounter_id=eq.${encounterId}`,
        },
        () => {
          fetchEncounter();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [encounterId, fetchEncounter]);

  const updateStatus = async (newStatus: EncounterStatus, reason?: string) => {
    if (!encounter) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_by: userData.user.id,
      };

      // Set timestamps based on status
      if (newStatus === 'preconsult_ready') {
        updates.preconsult_completed_at = new Date().toISOString();
      } else if (newStatus === 'consultation_in_progress') {
        updates.consultation_started_at = new Date().toISOString();
      } else if (newStatus === 'completed' || newStatus === 'cancelled') {
        updates.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('encounters')
        .update(updates)
        .eq('id', encounter.id);

      if (updateError) throw updateError;

      toast({
        title: 'Statut mis à jour',
        description: `L'épisode est maintenant "${newStatus}"`,
      });

      await fetchEncounter();
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const updateMode = async (newMode: EncounterMode) => {
    if (!encounter) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('encounters')
        .update({
          mode: newMode,
          updated_by: userData.user.id,
        })
        .eq('id', encounter.id);

      if (updateError) throw updateError;

      toast({
        title: 'Mode mis à jour',
        description: `Mode changé en "${newMode === 'solo' ? 'Solo' : 'Assisté'}"`,
      });

      await fetchEncounter();
    } catch (err) {
      console.error('Error updating mode:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de changer le mode',
        variant: 'destructive',
      });
    }
  };

  const linkConsultation = async (consultationId: string) => {
    if (!encounter) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('encounters')
        .update({
          consultation_id: consultationId,
          updated_by: userData.user.id,
        })
        .eq('id', encounter.id);

      if (updateError) throw updateError;

      await fetchEncounter();
    } catch (err) {
      console.error('Error linking consultation:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de lier la consultation',
        variant: 'destructive',
      });
    }
  };

  const linkPreconsultation = async (preconsultationId: string) => {
    if (!encounter) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('encounters')
        .update({
          preconsultation_id: preconsultationId,
          updated_by: userData.user.id,
        })
        .eq('id', encounter.id);

      if (updateError) throw updateError;

      await fetchEncounter();
    } catch (err) {
      console.error('Error linking preconsultation:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de lier la pré-consultation',
        variant: 'destructive',
      });
    }
  };

  return {
    encounter,
    loading,
    error,
    statusHistory,
    updateStatus,
    updateMode,
    linkConsultation,
    linkPreconsultation,
    refresh: fetchEncounter,
  };
}

// Hook pour créer un nouvel épisode
export function useCreateEncounter() {
  const { structureId } = useStructureId();
  const { toast } = useToast();

  const createEncounter = async (
    patientId: string,
    options?: {
      mode?: EncounterMode;
      queueEntryId?: string;
      appointmentId?: string;
      assignedPractitionerId?: string;
      assignedAssistantId?: string;
    }
  ): Promise<string | null> => {
    if (!structureId) {
      toast({
        title: 'Erreur',
        description: 'Structure non définie',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const mode = options?.mode || 'solo';
      const initialStatus: EncounterStatus = mode === 'assisted' 
        ? 'preconsult_in_progress' 
        : 'consultation_in_progress';

      const { data, error } = await supabase
        .from('encounters')
        .insert({
          patient_id: patientId,
          structure_id: structureId,
          mode,
          status: initialStatus,
          queue_entry_id: options?.queueEntryId || null,
          appointment_id: options?.appointmentId || null,
          assigned_practitioner_id: options?.assignedPractitionerId || null,
          assigned_assistant_id: options?.assignedAssistantId || null,
          created_by: userData.user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Épisode créé',
        description: `Nouvel épisode en mode ${mode === 'solo' ? 'Solo' : 'Assisté'}`,
      });

      return data.id;
    } catch (err) {
      console.error('Error creating encounter:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'épisode',
        variant: 'destructive',
      });
      return null;
    }
  };

  const createFromQueue = async (queueEntryId: string, mode: EncounterMode = 'solo'): Promise<string | null> => {
    try {
      // Get queue entry info first
      const { data: queueEntry, error: queueError } = await supabase
        .from('patient_queue')
        .select('patient_id, assigned_to')
        .eq('id', queueEntryId)
        .single();

      if (queueError || !queueEntry) throw queueError || new Error('Queue entry not found');

      return createEncounter(queueEntry.patient_id, {
        mode,
        queueEntryId,
        assignedPractitionerId: queueEntry.assigned_to || undefined,
      });
    } catch (err) {
      console.error('Error creating encounter from queue:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'épisode depuis la file',
        variant: 'destructive',
      });
      return null;
    }
  };

  return { createEncounter, createFromQueue };
}
