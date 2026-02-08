import { useState, useEffect, useCallback } from 'react';
import { 
  fetchAntecedents, 
  createAntecedent, 
  updateAntecedent,
  deleteAntecedent,
  Antecedent, 
  AntecedentFormData,
  AntecedentType
} from '@/lib/antecedents';
import { toast } from 'sonner';

export function useAntecedents(patientId: string | undefined) {
  const [antecedents, setAntecedents] = useState<Antecedent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const data = await fetchAntecedents(patientId);
      setAntecedents(data);
    } catch (error) {
      console.error('Error loading antecedents:', error);
      toast.error('Erreur lors du chargement des antécédents');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const getByType = useCallback((type: AntecedentType) => {
    return antecedents.filter(a => a.type === type);
  }, [antecedents]);

  const create = useCallback(async (
    structureId: string,
    userId: string,
    formData: AntecedentFormData
  ) => {
    if (!patientId) return null;

    try {
      const antecedent = await createAntecedent(
        patientId,
        structureId,
        userId,
        formData
      );
      setAntecedents(prev => [antecedent, ...prev]);
      toast.success('Antécédent ajouté');
      return antecedent;
    } catch (error) {
      console.error('Error creating antecedent:', error);
      toast.error("Erreur lors de l'ajout");
      return null;
    }
  }, [patientId]);

  const update = useCallback(async (
    antecedentId: string,
    userId: string,
    structureId: string,
    formData: Partial<AntecedentFormData>
  ) => {
    if (!patientId) return null;

    try {
      const updated = await updateAntecedent(
        antecedentId,
        userId,
        structureId,
        patientId,
        formData
      );
      setAntecedents(prev => 
        prev.map(a => a.id === antecedentId ? updated : a)
      );
      toast.success('Antécédent mis à jour');
      return updated;
    } catch (error) {
      console.error('Error updating antecedent:', error);
      toast.error('Erreur lors de la mise à jour');
      return null;
    }
  }, [patientId]);

  const remove = useCallback(async (
    antecedentId: string,
    userId: string,
    structureId: string
  ) => {
    if (!patientId) return false;

    try {
      await deleteAntecedent(antecedentId, userId, structureId, patientId);
      setAntecedents(prev => prev.filter(a => a.id !== antecedentId));
      toast.success('Antécédent supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting antecedent:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [patientId]);

  return {
    antecedents,
    loading,
    refresh: load,
    getByType,
    create,
    update,
    remove,
  };
}
