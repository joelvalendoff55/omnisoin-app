import { useState, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';

export interface ACIIndicator {
  id: string;
  structure_id: string;
  name: string;
  category: 'acces_soins' | 'travail_equipe' | 'systeme_info';
  current_value: number;
  target_value: number;
  unit: string;
  status: 'on_track' | 'at_risk' | 'late';
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useACIIndicators() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [indicators, setIndicators] = useState<ACIIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIndicators = async () => {
    if (!structureId) {
      setIndicators([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('aci_indicators')
        .select('*')
        .eq('structure_id', structureId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setIndicators((data as ACIIndicator[]) || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching ACI indicators:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!structureLoading) {
      fetchIndicators();
    }
  }, [structureId, structureLoading]);

  // Set up realtime subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('aci_indicators_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aci_indicators',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchIndicators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId]);

  const updateIndicator = async (id: string, updates: Partial<ACIIndicator>) => {
    const { error } = await supabase
      .from('aci_indicators')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const createIndicator = async (indicator: Omit<ACIIndicator, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('aci_indicators')
      .insert(indicator);

    if (error) throw error;
  };

  return {
    indicators,
    loading: loading || structureLoading,
    error,
    refetch: fetchIndicators,
    updateIndicator,
    createIndicator,
  };
}
