"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  HospitalPassage,
  HospitalPassageFormData,
  TacheVille,
  fetchHospitalPassages,
  createHospitalPassage,
  updateHospitalPassage,
  updateTachesVille,
  deleteHospitalPassage,
} from '@/lib/hospitalPassages';

export function useHospitalPassages(patientId: string) {
  const [passages, setPassages] = useState<HospitalPassage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const data = await fetchHospitalPassages(patientId);
      setPassages(data);
    } catch (error) {
      console.error('Error loading hospital passages:', error);
      toast.error('Erreur lors du chargement des passages');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (
    structureId: string,
    userId: string,
    formData: HospitalPassageFormData
  ) => {
    try {
      const newPassage = await createHospitalPassage(patientId, structureId, userId, formData);
      setPassages(prev => [newPassage, ...prev]);
      toast.success('Passage ajouté');
      return newPassage;
    } catch (error) {
      console.error('Error creating passage:', error);
      toast.error('Erreur lors de la création');
      throw error;
    }
  };

  const update = async (
    id: string,
    userId: string,
    structureId: string,
    updates: Partial<HospitalPassageFormData>
  ) => {
    try {
      const updated = await updateHospitalPassage(id, userId, structureId, patientId, updates);
      setPassages(prev => prev.map(p => p.id === id ? updated : p));
      toast.success('Passage mis à jour');
      return updated;
    } catch (error) {
      console.error('Error updating passage:', error);
      toast.error('Erreur lors de la mise à jour');
      throw error;
    }
  };

  const updateTaches = async (id: string, taches: TacheVille[]) => {
    try {
      await updateTachesVille(id, taches);
      setPassages(prev => prev.map(p => p.id === id ? { ...p, taches_ville: taches } : p));
    } catch (error) {
      console.error('Error updating taches:', error);
      toast.error('Erreur lors de la mise à jour des tâches');
      throw error;
    }
  };

  const remove = async (id: string, userId: string, structureId: string) => {
    try {
      await deleteHospitalPassage(id, userId, structureId, patientId);
      setPassages(prev => prev.filter(p => p.id !== id));
      toast.success('Passage supprimé');
    } catch (error) {
      console.error('Error deleting passage:', error);
      toast.error('Erreur lors de la suppression');
      throw error;
    }
  };

  return {
    passages,
    loading,
    reload: load,
    create,
    update,
    updateTaches,
    remove,
  };
}
