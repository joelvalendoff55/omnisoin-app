"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchOCRStats, OCRImportStats } from '@/lib/ocrStats';
import { useStructureId } from './useStructureId';

export function useOCRStats() {
  const [stats, setStats] = useState<OCRImportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { structureId } = useStructureId();

  const loadStats = useCallback(async () => {
    if (!structureId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOCRStats(structureId);
      setStats(data);
    } catch (err) {
      console.error('Error loading OCR stats:', err);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refetch: loadStats,
  };
}
