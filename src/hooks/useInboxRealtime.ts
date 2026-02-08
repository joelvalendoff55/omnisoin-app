"use client";

import { useEffect, useRef, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

interface InboxRealtimeOptions {
  enabled?: boolean;
  throttleMs?: number;
  onRefresh?: () => void;
}

export function useInboxRealtime(options: InboxRealtimeOptions = {}) {
  const { enabled = true, throttleMs = 2000, onRefresh } = options;
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const lastToastTime = useRef<number>(0);

  const showThrottledToast = useCallback(
    (message: string) => {
      const now = Date.now();
      if (now - lastToastTime.current >= throttleMs) {
        lastToastTime.current = now;
        toast.info(message, {
          duration: 3000,
          position: 'bottom-right',
        });
      }
    },
    [throttleMs]
  );

  useEffect(() => {
    if (!enabled || !user || !structureId) {
      return;
    }

    // Subscribe to inbox_messages changes
    const inboxChannel = supabase
      .channel('realtime-inbox-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          // If onRefresh callback is provided, call it instead of showing toast
          if (onRefresh) {
            onRefresh();
          } else {
            showThrottledToast('Nouveau message reçu');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inbox_messages',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          // If onRefresh callback is provided, call it
          if (onRefresh) {
            onRefresh();
          } else {
            showThrottledToast('Message mis à jour');
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(inboxChannel);
    };
  }, [enabled, user, structureId, showThrottledToast, onRefresh]);
}
