"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { HospitalPassage, TacheVille } from '@/lib/hospitalPassages';
import { useStructureId } from '@/hooks/useStructureId';

interface UseAllHospitalPassagesOptions {
  limit?: number;
  period?: '24h' | '7d' | '30d' | 'all';
  riskLevel?: 'eleve' | 'modere' | 'standard' | 'all';
}

export function useAllHospitalPassages(options: UseAllHospitalPassagesOptions = {}) {
  const { limit = 50, period = '7d', riskLevel = 'all' } = options;
  const { structureId } = useStructureId();
  const [passages, setPassages] = useState<(HospitalPassage & { patient_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassagesCount, setNewPassagesCount] = useState(0);

  const load = useCallback(async () => {
    if (!structureId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('hospital_passages')
        .select(`
          *,
          patients!inner(first_name, last_name)
        `)
        .eq('structure_id', structureId)
        .order('passage_date', { ascending: false })
        .limit(limit);

      // Period filter
      if (period !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (period) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('passage_date', startDate.toISOString());
      }

      // Risk level filter
      if (riskLevel !== 'all') {
        query = query.eq('risk_level', riskLevel);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((p: any) => ({
        ...p,
        patient_name: `${p.patients.first_name} ${p.patients.last_name}`,
        taches_ville: p.taches_ville as TacheVille[] | null,
      }));

      setPassages(formatted);
      
      // Count passages in last 24h as "new"
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newCount = formatted.filter(
        (p) => new Date(p.created_at) > oneDayAgo
      ).length;
      setNewPassagesCount(newCount);
      
    } catch (error) {
      console.error('Error loading hospital passages:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId, limit, period, riskLevel]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('hospital_passages_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hospital_passages',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, load]);

  return {
    passages,
    loading,
    reload: load,
    newPassagesCount,
  };
}
