import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { 
  VitalSign, 
  VitalSignFormData, 
  fetchVitalSigns, 
  fetchLatestVitalSign, 
  createVitalSign, 
  updateVitalSign 
} from '@/lib/vitalSigns';
import { useToast } from '@/hooks/use-toast';

interface UseVitalSignsOptions {
  patientId: string;
  structureId: string;
}

export function useVitalSigns({ patientId, structureId }: UseVitalSignsOptions) {
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [latestVitalSign, setLatestVitalSign] = useState<VitalSign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadVitalSigns = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      const [all, latest] = await Promise.all([
        fetchVitalSigns(patientId),
        fetchLatestVitalSign(patientId),
      ]);
      setVitalSigns(all);
      setLatestVitalSign(latest);
    } catch (error) {
      // Log silently instead of showing intrusive toast
      console.error('[VitalSigns] Error loading vital signs:', error);
      // Don't block the UI - just set empty state
    } finally {
      setLoading(false);
    }
  }, [patientId, toast]);

  useEffect(() => {
    loadVitalSigns();
  }, [loadVitalSigns]);

  // Realtime subscription
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`vital-signs-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_vital_signs',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          loadVitalSigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, loadVitalSigns]);

  const addVitalSign = useCallback(
    async (userId: string, formData: VitalSignFormData) => {
      try {
        setSaving(true);
        const newVitalSign = await createVitalSign(patientId, structureId, userId, formData);
        setVitalSigns((prev) => [newVitalSign, ...prev]);
        setLatestVitalSign(newVitalSign);
        toast({
          title: 'Constantes enregistrées',
          description: 'Les constantes vitales ont été enregistrées avec succès',
        });
        return newVitalSign;
      } catch (error) {
        console.error('Error creating vital sign:', error);
        toast({
          title: 'Erreur',
          description: "Impossible d'enregistrer les constantes vitales",
          variant: 'destructive',
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [patientId, structureId, toast]
  );

  const editVitalSign = useCallback(
    async (vitalSignId: string, userId: string, formData: Partial<VitalSignFormData>) => {
      try {
        setSaving(true);
        const updated = await updateVitalSign(vitalSignId, userId, structureId, patientId, formData);
        setVitalSigns((prev) =>
          prev.map((v) => (v.id === vitalSignId ? { ...v, ...updated } : v))
        );
        if (latestVitalSign?.id === vitalSignId) {
          setLatestVitalSign({ ...latestVitalSign, ...updated });
        }
        toast({
          title: 'Constantes mises à jour',
          description: 'Les constantes vitales ont été mises à jour',
        });
        return updated;
      } catch (error) {
        console.error('Error updating vital sign:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour les constantes vitales',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [patientId, structureId, latestVitalSign, toast]
  );

  return {
    vitalSigns,
    latestVitalSign,
    loading,
    saving,
    addVitalSign,
    editVitalSign,
    refresh: loadVitalSigns,
  };
}
