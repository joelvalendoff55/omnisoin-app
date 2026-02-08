"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import type { AnamnesisRecord } from '@/types/anamnesis';

interface UseAnamnesisRealtimeOptions {
  patientId?: string | null;
  transcriptId?: string | null;
  onUpdate?: (anamnesis: AnamnesisRecord) => void;
}

/**
 * Hook to subscribe to realtime updates for anamnesis records
 */
export function useAnamnesisRealtime({
  patientId,
  transcriptId,
  onUpdate,
}: UseAnamnesisRealtimeOptions) {
  const [latestAnamnesis, setLatestAnamnesis] = useState<AnamnesisRecord | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep callback ref up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const subscribe = useCallback(() => {
    if (!patientId && !transcriptId) return null;

    const filter = transcriptId 
      ? `transcript_id=eq.${transcriptId}` 
      : `patient_id=eq.${patientId}`;

    const channelName = transcriptId 
      ? `anamnesis-transcript-${transcriptId}` 
      : `anamnesis-patient-${patientId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultation_anamnesis',
          filter,
        },
        (payload) => {
          const newAnamnesis = payload.new as AnamnesisRecord;
          setLatestAnamnesis(newAnamnesis);
          onUpdateRef.current?.(newAnamnesis);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_anamnesis',
          filter,
        },
        (payload) => {
          const newAnamnesis = payload.new as AnamnesisRecord;
          setLatestAnamnesis(newAnamnesis);
          onUpdateRef.current?.(newAnamnesis);
        }
      )
      .subscribe();

    return channel;
  }, [patientId, transcriptId]);

  useEffect(() => {
    const channel = subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [subscribe]);

  return { latestAnamnesis };
}
