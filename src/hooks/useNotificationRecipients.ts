"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import {
  NotificationRecipient,
  EventKey,
  TargetType,
  NotificationChannel,
  fetchNotificationRecipients,
  setEventRecipients,
} from '@/lib/teams';
import { toast } from 'sonner';

export interface EventRecipientConfig {
  targetType: TargetType;
  targetIds: string[];
  isEnabled: boolean;
}

export type EventRecipientsMap = Record<EventKey, EventRecipientConfig>;

const DEFAULT_CONFIG: EventRecipientConfig = {
  targetType: 'structure',
  targetIds: [],
  isEnabled: true,
};

// Smart default team names for auto-assignment
export const DEFAULT_TEAM_ASSIGNMENTS: Record<EventKey, string[]> = {
  new_appointment: ['Assistantes'],
  cancel_appointment: ['Assistantes'],
  no_show: ['Assistantes', 'Coordination'],
  urgent_alert: [], // Security: no default recipients
  daily_summary: ['Coordination'],
};

export interface UseNotificationRecipientsResult {
  config: EventRecipientsMap;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateEvent: (
    eventKey: EventKey,
    targetType: TargetType,
    targetIds: string[]
  ) => void;
  toggleEventEnabled: (eventKey: EventKey, isEnabled: boolean) => void;
  save: () => Promise<boolean>;
  hasChanges: boolean;
  hasNoRecipients: (eventKey: EventKey) => boolean;
}

export function useNotificationRecipients(channel: NotificationChannel = 'email'): UseNotificationRecipientsResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [config, setConfig] = useState<EventRecipientsMap>({
    new_appointment: { ...DEFAULT_CONFIG },
    cancel_appointment: { ...DEFAULT_CONFIG },
    no_show: { ...DEFAULT_CONFIG },
    urgent_alert: { ...DEFAULT_CONFIG },
    daily_summary: { ...DEFAULT_CONFIG },
  });
  const [originalConfig, setOriginalConfig] = useState<EventRecipientsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const buildConfigFromRecipients = useCallback((data: NotificationRecipient[]): EventRecipientsMap => {
    const result: EventRecipientsMap = {
      new_appointment: { ...DEFAULT_CONFIG },
      cancel_appointment: { ...DEFAULT_CONFIG },
      no_show: { ...DEFAULT_CONFIG },
      urgent_alert: { ...DEFAULT_CONFIG },
      daily_summary: { ...DEFAULT_CONFIG },
    };

    const eventKeys: EventKey[] = ['new_appointment', 'cancel_appointment', 'no_show', 'urgent_alert', 'daily_summary'];

    for (const eventKey of eventKeys) {
      const eventRecipients = data.filter(r => r.event_key === eventKey && r.channel === channel);
      
      // Check if any recipient is enabled for this event
      const hasEnabledRecipients = eventRecipients.some(r => r.is_enabled);
      
      if (eventRecipients.length === 0) {
        // No config exists - default to structure but disabled
        result[eventKey] = { targetType: 'structure', targetIds: [], isEnabled: false };
      } else if (eventRecipients.some(r => r.target_type === 'structure')) {
        result[eventKey] = { 
          targetType: 'structure', 
          targetIds: [],
          isEnabled: hasEnabledRecipients
        };
      } else if (eventRecipients.some(r => r.target_type === 'team')) {
        result[eventKey] = {
          targetType: 'team',
          targetIds: eventRecipients.filter(r => r.target_type === 'team' && r.target_id).map(r => r.target_id!),
          isEnabled: hasEnabledRecipients
        };
      } else if (eventRecipients.some(r => r.target_type === 'user')) {
        result[eventKey] = {
          targetType: 'user',
          targetIds: eventRecipients.filter(r => r.target_type === 'user' && r.target_id).map(r => r.target_id!),
          isEnabled: hasEnabledRecipients
        };
      }
    }

    return result;
  }, [channel]);

  const refetch = useCallback(async () => {
    if (!structureId) {
      setRecipients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotificationRecipients(structureId);
      setRecipients(data);
      const newConfig = buildConfigFromRecipients(data);
      setConfig(newConfig);
      setOriginalConfig(newConfig);
    } catch (err) {
      console.error('Error fetching notification recipients:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId, buildConfigFromRecipients]);

  useEffect(() => {
    if (!structureLoading) {
      refetch();
    }
  }, [structureLoading, refetch]);

  const updateEvent = (eventKey: EventKey, targetType: TargetType, targetIds: string[]) => {
    setConfig(prev => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], targetType, targetIds },
    }));
  };

  const toggleEventEnabled = (eventKey: EventKey, isEnabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], isEnabled },
    }));
  };

  const hasNoRecipients = (eventKey: EventKey): boolean => {
    const eventConfig = config[eventKey];
    if (!eventConfig.isEnabled) return false;
    if (eventConfig.targetType === 'structure') return false;
    return eventConfig.targetIds.length === 0;
  };

  const hasChanges = originalConfig
    ? JSON.stringify(config) !== JSON.stringify(originalConfig)
    : false;

  const save = async (): Promise<boolean> => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return false;
    }

    try {
      const eventKeys: EventKey[] = ['new_appointment', 'cancel_appointment', 'no_show', 'urgent_alert', 'daily_summary'];
      
      for (const eventKey of eventKeys) {
        const eventConfig = config[eventKey];
        await setEventRecipients(
          structureId,
          eventKey,
          eventConfig.targetType,
          eventConfig.targetIds,
          channel,
          eventConfig.isEnabled
        );
      }

      toast.success('Configuration des destinataires enregistrée');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error saving notification recipients:', err);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    }
  };

  return {
    config,
    loading: loading || structureLoading,
    error,
    refetch,
    updateEvent,
    toggleEventEnabled,
    save,
    hasChanges,
    hasNoRecipients,
  };
}
