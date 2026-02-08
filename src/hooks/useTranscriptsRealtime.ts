"use client";

import { useEffect, useRef, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';

interface UseTranscriptsRealtimeOptions {
  structureId: string | null;
  enabled?: boolean;
  onRefresh?: () => void;
}

export function useTranscriptsRealtime({
  structureId,
  enabled = true,
  onRefresh,
}: UseTranscriptsRealtimeOptions) {
  const lastToastTime = useRef<number>(0);
  const TOAST_THROTTLE_MS = 2000;

  const showThrottledToast = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastToastTime.current >= TOAST_THROTTLE_MS) {
      toast.success(message);
      lastToastTime.current = now;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !structureId) return;

    const channel = supabase
      .channel('realtime-transcripts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_transcripts',
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;

          // Only refresh if status actually changed
          if (oldStatus !== newStatus) {
            // Show toast only when transcript becomes ready
            if (newStatus === 'ready') {
              showThrottledToast('Transcription prête !');
            }
            // Trigger refresh
            onRefresh?.();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_transcripts',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          onRefresh?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, enabled, onRefresh, showThrottledToast]);
}
