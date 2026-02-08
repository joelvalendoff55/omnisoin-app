import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useToast } from '@/hooks/use-toast';
import { useStructureId } from '@/hooks/useStructureId';
import type { EncounterMode, Encounter } from '@/types/encounter';

interface UseOpenEncounterOptions {
  patientId: string;
  queueEntryId?: string;
  appointmentId?: string;
  assignedPractitionerId?: string;
  assignedAssistantId?: string;
  defaultMode?: EncounterMode;
}

interface UseOpenEncounterResult {
  openOrCreateEncounter: (mode?: EncounterMode) => Promise<void>;
  isLoading: boolean;
  existingEncounterId: string | null;
}

/**
 * Hook pour ouvrir un épisode existant ou en créer un nouveau.
 * Vérifie d'abord si un épisode existe déjà pour ce patient aujourd'hui.
 */
export function useOpenEncounter({
  patientId,
  queueEntryId,
  appointmentId,
  assignedPractitionerId,
  assignedAssistantId,
  defaultMode = 'solo',
}: UseOpenEncounterOptions): UseOpenEncounterResult {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { structureId } = useStructureId();
  const [isLoading, setIsLoading] = useState(false);
  const [existingEncounterId, setExistingEncounterId] = useState<string | null>(null);

  const openOrCreateEncounter = useCallback(async (mode?: EncounterMode) => {
    if (!structureId || !patientId) {
      toast({
        title: 'Erreur',
        description: 'Données manquantes pour ouvrir l\'épisode',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check for existing encounter today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: existingEncounters, error: searchError } = await supabase
        .from('encounters')
        .select('id, status')
        .eq('patient_id', patientId)
        .eq('structure_id', structureId)
        .gte('started_at', todayISO)
        .not('status', 'in', '("completed","cancelled")')
        .order('started_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;

      // If encounter exists, open it
      if (existingEncounters && existingEncounters.length > 0) {
        const encounter = existingEncounters[0];
        setExistingEncounterId(encounter.id);
        navigate(`/encounter/${encounter.id}`);
        return;
      }

      // Create new encounter
      const selectedMode = mode || defaultMode;
      const initialStatus = selectedMode === 'assisted' 
        ? 'preconsult_in_progress' 
        : 'consultation_in_progress';

      const { data: newEncounter, error: createError } = await supabase
        .from('encounters')
        .insert({
          patient_id: patientId,
          structure_id: structureId,
          mode: selectedMode,
          status: initialStatus,
          queue_entry_id: queueEntryId || null,
          appointment_id: appointmentId || null,
          assigned_practitioner_id: assignedPractitionerId || null,
          assigned_assistant_id: assignedAssistantId || null,
          created_by: userData.user.id,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      toast({
        title: 'Épisode créé',
        description: `Mode ${selectedMode === 'solo' ? 'Solo' : 'Assisté'}`,
      });

      navigate(`/encounter/${newEncounter.id}`);
    } catch (err) {
      console.error('Error opening/creating encounter:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir l\'épisode',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    structureId, 
    patientId, 
    queueEntryId, 
    appointmentId, 
    assignedPractitionerId, 
    assignedAssistantId,
    defaultMode, 
    navigate, 
    toast
  ]);

  return {
    openOrCreateEncounter,
    isLoading,
    existingEncounterId,
  };
}
