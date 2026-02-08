import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { 
  ConsultationObservation, 
  ConsultationObservationFormData,
  fetchConsultationObservations, 
  createConsultationObservation, 
  updateConsultationObservation,
  deleteConsultationObservation
} from '@/lib/consultationObservations';
import { useToast } from '@/hooks/use-toast';

interface UseConsultationObservationsOptions {
  patientId: string;
  structureId: string;
  consultationId?: string;
}

export function useConsultationObservations({ 
  patientId, 
  structureId, 
  consultationId 
}: UseConsultationObservationsOptions) {
  const [observations, setObservations] = useState<ConsultationObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadObservations = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      const data = await fetchConsultationObservations(patientId, consultationId);
      setObservations(data);
    } catch (error) {
      console.error('[ConsultationObservations] Error loading:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId, consultationId]);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  // Realtime subscription
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`consultation-observations-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_observations',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          loadObservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, loadObservations]);

  const addObservation = useCallback(
    async (userId: string, userRole: string, formData: ConsultationObservationFormData) => {
      try {
        setSaving(true);
        const newObservation = await createConsultationObservation(
          patientId, 
          structureId, 
          userId, 
          userRole,
          formData
        );
        setObservations((prev) => [newObservation, ...prev]);
        toast({
          title: 'Observation enregistrée',
          description: 'Votre observation a été ajoutée avec succès',
        });
        return newObservation;
      } catch (error) {
        console.error('Error creating observation:', error);
        toast({
          title: 'Erreur',
          description: "Impossible d'enregistrer l'observation",
          variant: 'destructive',
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [patientId, structureId, toast]
  );

  const editObservation = useCallback(
    async (observationId: string, userId: string, content: string) => {
      try {
        setSaving(true);
        const updated = await updateConsultationObservation(
          observationId, 
          userId, 
          structureId, 
          patientId, 
          content
        );
        setObservations((prev) =>
          prev.map((o) => (o.id === observationId ? { ...o, ...updated } : o))
        );
        toast({
          title: 'Observation mise à jour',
        });
        return updated;
      } catch (error) {
        console.error('Error updating observation:', error);
        toast({
          title: 'Erreur',
          description: "Impossible de mettre à jour l'observation",
          variant: 'destructive',
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [patientId, structureId, toast]
  );

  const removeObservation = useCallback(
    async (observationId: string, userId: string) => {
      try {
        setSaving(true);
        await deleteConsultationObservation(observationId, userId, structureId, patientId);
        setObservations((prev) => prev.filter((o) => o.id !== observationId));
        toast({
          title: 'Observation supprimée',
        });
      } catch (error) {
        console.error('Error deleting observation:', error);
        toast({
          title: 'Erreur',
          description: "Impossible de supprimer l'observation",
          variant: 'destructive',
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [patientId, structureId, toast]
  );

  return {
    observations,
    loading,
    saving,
    addObservation,
    editObservation,
    removeObservation,
    refresh: loadObservations,
  };
}
