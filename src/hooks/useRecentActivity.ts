import { useEffect, useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';

export interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  patient_name: string | null;
  actor_name: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  PATIENT_CREATED: 'Patient créé',
  PATIENT_UPDATED: 'Patient modifié',
  PATIENT_ARCHIVED: 'Patient archivé',
  PATIENT_RESTORED: 'Patient restauré',
  DELEGATION_CREATED: 'Délégation créée',
  DELEGATION_DELETED: 'Délégation supprimée',
  TRANSCRIPTION_REQUESTED: 'Transcription demandée',
  TRANSCRIPTION_READY: 'Transcription terminée',
  TRANSCRIPTION_FAILED: 'Transcription échouée',
  TRANSCRIPT_SUMMARY_REQUESTED: 'Résumé demandé',
  TRANSCRIPT_SUMMARY_READY: 'Résumé terminé',
  TRANSCRIPT_SUMMARY_FAILED: 'Résumé échoué',
  INBOX_MESSAGE_ASSIGNED: 'Message rattaché',
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export function useRecentActivity() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (structureLoading || !structureId) return;

    const fetchActivity = async () => {
      try {
        const { data } = await supabase
          .from('activity_logs')
          .select(`
            id,
            action,
            created_at,
            patients (
              first_name,
              last_name
            )
          `)
          .eq('structure_id', structureId)
          .order('created_at', { ascending: false })
          .limit(10);

        setActivities(
          (data || []).map((item: any) => ({
            id: item.id,
            action: item.action,
            created_at: item.created_at,
            patient_name: item.patients
              ? `${item.patients.first_name} ${item.patients.last_name}`
              : null,
            actor_name: null,
          }))
        );
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [structureId, structureLoading]);

  return { activities, loading };
}
