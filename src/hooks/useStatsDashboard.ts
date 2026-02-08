import { useState, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from './useStructureId';

export interface StatsDashboardData {
  structure_id: string;
  // Patient metrics
  patients_active: number;
  patients_archived: number;
  patients_new_30d: number;
  // Queue metrics
  queue_waiting: number;
  queue_in_progress: number;
  queue_completed_today: number;
  queue_completed_7d: number;
  queue_completed_30d: number;
  avg_wait_time_minutes_7d: number;
  // Task metrics
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_7d: number;
  tasks_overdue: number;
  // Appointment metrics
  appointments_today: number;
  appointments_completed_today: number;
  appointments_7d: number;
  appointments_upcoming_7d: number;
  // Inbox/Document metrics
  inbox_total: number;
  inbox_unassigned: number;
  inbox_7d: number;
  inbox_30d: number;
  // Transcript metrics
  transcripts_total: number;
  transcripts_uploaded: number;
  transcripts_ready: number;
  transcripts_failed: number;
  transcripts_7d: number;
  // Summary metrics
  summaries_ready: number;
  summaries_failed: number;
  avg_summary_latency_ms_7d: number;
}

export interface UseStatsDashboardResult {
  data: StatsDashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStatsDashboard(): UseStatsDashboardResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const [data, setData] = useState<StatsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!structureId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_stats_dashboard');

      if (statsError) {
        console.error('Error fetching stats dashboard:', statsError);
        setError(statsError.message);
        setData(null);
      } else if (statsData && statsData.length > 0) {
        // The RPC returns an array, we need the first (and only) row
        setData(statsData[0] as StatsDashboardData);
      } else {
        // No data found - set empty stats
        setData(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching stats:', err);
      setError('Une erreur inattendue est survenue');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (structureLoading) return;
    fetchStats();
  }, [structureId, structureLoading]);

  return {
    data,
    loading: loading || structureLoading,
    error,
    refetch: fetchStats,
  };
}
