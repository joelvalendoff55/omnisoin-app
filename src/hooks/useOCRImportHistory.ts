"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchImportHistory, 
  revertImport, 
  OCRImportRecord 
} from '@/lib/ocrImportHistory';
import { useAuth } from './useAuth';
import { useStructureId } from './useStructureId';
import { toast } from 'sonner';

export function useOCRImportHistory(patientId: string | undefined) {
  const [history, setHistory] = useState<OCRImportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);
  const { user } = useAuth();
  const { structureId } = useStructureId();

  const loadHistory = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const data = await fetchImportHistory(patientId);
      setHistory(data);
    } catch (err) {
      console.error('Error loading import history:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRevert = useCallback(async (importId: string) => {
    if (!user?.id || !structureId || !patientId) {
      toast.error('Données manquantes pour l\'annulation');
      return false;
    }

    setReverting(importId);
    try {
      const result = await revertImport(importId, user.id, structureId, patientId);
      
      if (result.success) {
        toast.success(`Import annulé`, {
          description: result.deletedCount > 0 
            ? `${result.deletedCount} antécédent(s) supprimé(s)` 
            : 'Aucun antécédent à supprimer',
        });
        await loadHistory();
        return true;
      } else {
        toast.error('Échec de l\'annulation', {
          description: result.error,
        });
        return false;
      }
    } catch (err) {
      console.error('Error reverting import:', err);
      toast.error('Erreur lors de l\'annulation');
      return false;
    } finally {
      setReverting(null);
    }
  }, [user?.id, structureId, patientId, loadHistory]);

  return {
    history,
    loading,
    reverting,
    refetch: loadHistory,
    revertImport: handleRevert,
  };
}
