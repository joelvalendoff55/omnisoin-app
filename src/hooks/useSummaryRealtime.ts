"use client";

import { useEffect, useCallback, useRef } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import type { TranscriptSummary } from '@/lib/summaries';

interface UseSummaryRealtimeOptions {
  transcriptId: string | null;
  onUpdate?: (summary: TranscriptSummary) => void;
}

/**
 * Hook to subscribe to realtime updates for a specific transcript's summary
 */
export function useSummaryRealtime({
  transcriptId,
  onUpdate,
}: UseSummaryRealtimeOptions) {
  const onUpdateRef = useRef(onUpdate);
  
  // Keep callback ref up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const subscribe = useCallback(() => {
    if (!transcriptId) return null;

    const channel = supabase
      .channel(`summary-${transcriptId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcript_summaries',
          filter: `transcript_id=eq.${transcriptId}`,
        },
        (payload) => {
          const newSummary = payload.new as TranscriptSummary;
          onUpdateRef.current?.(newSummary);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_summaries',
          filter: `transcript_id=eq.${transcriptId}`,
        },
        (payload) => {
          const newSummary = payload.new as TranscriptSummary;
          onUpdateRef.current?.(newSummary);
        }
      )
      .subscribe();

    return channel;
  }, [transcriptId]);

  useEffect(() => {
    const channel = subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [subscribe]);
}
