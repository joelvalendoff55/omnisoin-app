"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

interface FeatureFlag {
  flag_name: string;
  is_enabled: boolean;
  description: string | null;
}

interface UseFeatureFlagsResult {
  flags: Record<string, boolean>;
  loading: boolean;
  error: Error | null;
  isEnabled: (flagName: string) => boolean;
  healthDataEnabled: boolean;
  refetch: () => Promise<void>;
}

export function useFeatureFlags(): UseFeatureFlagsResult {
  const { user } = useAuth();
  const { structureId, loading: structureLoading } = useStructureId();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = async () => {
    if (!user || structureLoading || !structureId) {
      setFlags({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('feature_flags')
        .select('flag_name, is_enabled, description')
        .eq('structure_id', structureId);

      if (fetchError) {
        throw fetchError;
      }

      const flagsMap: Record<string, boolean> = {};
      (data || []).forEach((flag: FeatureFlag) => {
        flagsMap[flag.flag_name] = flag.is_enabled;
      });
      
      setFlags(flagsMap);
      setError(null);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setFlags({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [user, structureId, structureLoading]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchFlags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId]);

  const isEnabled = (flagName: string): boolean => {
    return flags[flagName] ?? false;
  };

  return {
    flags,
    loading: loading || structureLoading,
    error,
    isEnabled,
    healthDataEnabled: flags['health_data_enabled'] ?? false,
    refetch: fetchFlags,
  };
}
