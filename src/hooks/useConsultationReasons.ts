import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import {
  ConsultationReason,
  ConsultationReasonFormData,
  fetchConsultationReasons,
  createConsultationReason,
  updateConsultationReason,
  deleteConsultationReason,
  toggleConsultationReasonActive,
} from '@/lib/consultationReasons';
import { toast } from 'sonner';

interface UseConsultationReasonsOptions {
  activeOnly?: boolean;
}

interface UseConsultationReasonsResult {
  reasons: ConsultationReason[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (formData: ConsultationReasonFormData) => Promise<void>;
  update: (id: string, formData: Partial<ConsultationReasonFormData>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export function useConsultationReasons(
  options: UseConsultationReasonsOptions = {}
): UseConsultationReasonsResult {
  const { activeOnly = true } = options;
  const { structureId } = useStructureId();
  const [reasons, setReasons] = useState<ConsultationReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!structureId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchConsultationReasons(structureId, activeOnly);
      setReasons(data);
    } catch (err) {
      console.error('Error fetching consultation reasons:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId, activeOnly]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (formData: ConsultationReasonFormData) => {
      if (!structureId) return;

      try {
        await createConsultationReason(structureId, formData);
        toast.success('Motif créé avec succès');
        await refetch();
      } catch (err) {
        console.error('Error creating consultation reason:', err);
        toast.error('Erreur lors de la création du motif');
        throw err;
      }
    },
    [structureId, refetch]
  );

  const update = useCallback(
    async (id: string, formData: Partial<ConsultationReasonFormData>) => {
      try {
        await updateConsultationReason(id, formData);
        toast.success('Motif mis à jour');
        await refetch();
      } catch (err) {
        console.error('Error updating consultation reason:', err);
        toast.error('Erreur lors de la mise à jour du motif');
        throw err;
      }
    },
    [refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteConsultationReason(id);
        toast.success('Motif supprimé');
        await refetch();
      } catch (err) {
        console.error('Error deleting consultation reason:', err);
        toast.error('Erreur lors de la suppression du motif');
        throw err;
      }
    },
    [refetch]
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        await toggleConsultationReasonActive(id, isActive);
        toast.success(isActive ? 'Motif activé' : 'Motif désactivé');
        await refetch();
      } catch (err) {
        console.error('Error toggling consultation reason:', err);
        toast.error('Erreur lors de la modification du statut');
        throw err;
      }
    },
    [refetch]
  );

  return {
    reasons,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    toggleActive,
  };
}
