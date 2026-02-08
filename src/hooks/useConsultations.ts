"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchConsultations, 
  createConsultation, 
  updateConsultation,
  Consultation, 
  ConsultationFormData 
} from '@/lib/consultations';
import { toast } from 'sonner';

export function useConsultations(patientId: string | undefined) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const data = await fetchConsultations(patientId);
      setConsultations(data);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Erreur lors du chargement des consultations');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (
    practitionerId: string,
    structureId: string,
    userId: string,
    formData: ConsultationFormData
  ) => {
    if (!patientId) return null;

    try {
      const consultation = await createConsultation(
        patientId,
        practitionerId,
        structureId,
        userId,
        formData
      );
      setConsultations(prev => [consultation, ...prev]);
      toast.success('Consultation créée');
      return consultation;
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  }, [patientId]);

  const update = useCallback(async (
    consultationId: string,
    userId: string,
    structureId: string,
    formData: Partial<ConsultationFormData>
  ) => {
    if (!patientId) return null;

    try {
      const updated = await updateConsultation(
        consultationId,
        userId,
        structureId,
        patientId,
        formData
      );
      setConsultations(prev => 
        prev.map(c => c.id === consultationId ? { ...c, ...updated } : c)
      );
      toast.success('Consultation mise à jour');
      return updated;
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast.error('Erreur lors de la mise à jour');
      return null;
    }
  }, [patientId]);

  return {
    consultations,
    loading,
    refresh: load,
    create,
    update,
  };
}
