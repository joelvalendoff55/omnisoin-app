"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { QueueEntry, fetchQueue, updateQueueEntry } from '@/lib/queue';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorPermission } from '@/hooks/useDoctorPermission';
import { createNotification } from '@/lib/notifications';
import { toast } from 'sonner';

interface UseDoctorQueueResult {
  entries: QueueEntry[];
  readyPatients: QueueEntry[];
  inConsultation: QueueEntry | null;
  loading: boolean;
  error: Error | null;
  markReady: (entryId: string, notes?: string) => Promise<void>;
  startConsultation: (entryId: string) => Promise<void>;
  completeConsultation: (entryId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDoctorQueue(): UseDoctorQueueResult {
  const { structureId } = useStructureId();
  const { user } = useAuth();
  const { isDoctor } = useDoctorPermission();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadQueue = useCallback(async () => {
    if (!structureId) return;
    
    try {
      setLoading(true);
      // Fetch with extended fields
      const { data, error: fetchError } = await supabase
        .from('patient_queue')
        .select(`
          *,
          patient:patients(id, first_name, last_name, phone),
          assigned_team_member:team_members(id, job_title, user_id),
          consultation_reason:consultation_reasons(id, code, label, category, color)
        `)
        .eq('structure_id', structureId)
        .in('status', ['present', 'waiting', 'called', 'in_consultation'])
        .order('priority', { ascending: true })
        .order('arrival_time', { ascending: true });

      if (fetchError) throw fetchError;
      setEntries((data || []) as unknown as QueueEntry[]);
      setError(null);
    } catch (err) {
      console.error('Error loading doctor queue:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!structureId) return;

    loadQueue();

    const channel = supabase
      .channel('doctor_queue_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          console.log('Queue update:', payload);
          loadQueue();
          
          // Notify doctor when patient is marked ready
          if (payload.eventType === 'UPDATE' && isDoctor && user) {
            const newRecord = payload.new as QueueEntry;
            const oldRecord = payload.old as QueueEntry;
            
            if (newRecord.ready_at && !oldRecord.ready_at) {
              // Play notification sound
              try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {}
              
              toast.info('Patient prêt pour consultation', {
                description: 'Un nouveau patient est prêt à être consulté',
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, loadQueue, isDoctor, user]);

  // Mark patient as ready (for assistants)
  const markReady = async (entryId: string, notes?: string) => {
    if (!user || !structureId) return;

    try {
      const updates: Record<string, unknown> = {
        ready_at: new Date().toISOString(),
        status: 'called',
        called_at: new Date().toISOString(),
      };
      
      if (notes) {
        updates.assistant_notes = notes;
      }

      const { error: updateError } = await supabase
        .from('patient_queue')
        .update(updates)
        .eq('id', entryId);

      if (updateError) throw updateError;

      // Find the entry to get patient info
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        // Notify all doctors in the structure
        const { data: doctors } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('structure_id', structureId)
          .not('specialty', 'is', null);

        for (const doctor of doctors || []) {
          if (doctor.user_id) {
            await createNotification(
              doctor.user_id,
              structureId,
              'Patient prêt',
              `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''} est prêt pour consultation`,
              'queue',
              `/medecin-dashboard`
            );
          }
        }
      }

      toast.success('Patient marqué prêt');
      await loadQueue();
    } catch (err) {
      console.error('Error marking patient ready:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Start consultation (for doctors)
  const startConsultation = async (entryId: string) => {
    if (!user) return;

    try {
      // Get team member ID for the current user
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { error: updateError } = await supabase
        .from('patient_queue')
        .update({
          status: 'in_consultation',
          started_at: new Date().toISOString(),
          assigned_to: teamMember?.id || null,
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      toast.success('Consultation démarrée');
      await loadQueue();
    } catch (err) {
      console.error('Error starting consultation:', err);
      toast.error('Erreur lors du démarrage');
    }
  };

  // Complete consultation
  const completeConsultation = async (entryId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('patient_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      toast.success('Consultation terminée');
      await loadQueue();
    } catch (err) {
      console.error('Error completing consultation:', err);
      toast.error('Erreur lors de la clôture');
    }
  };

  // Derived data
  const readyPatients = entries.filter(e => 
    e.ready_at && 
    e.status !== 'in_consultation' && 
    e.status !== 'completed'
  );

  const inConsultation = entries.find(e => e.status === 'in_consultation') || null;

  return {
    entries,
    readyPatients,
    inConsultation,
    loading,
    error,
    markReady,
    startConsultation,
    completeConsultation,
    refresh: loadQueue,
  };
}
