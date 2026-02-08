import { useEffect, useState, useCallback, useRef } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import {
  TodayStats,
  WeeklyActivity,
  RecentActivityItem,
  getTodayStats,
  getWeeklyActivity,
  getRecentActivity,
} from '@/lib/dashboardStats';

interface UseMSPDashboardResult {
  todayStats: TodayStats;
  weeklyActivity: WeeklyActivity[];
  recentActivity: RecentActivityItem[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_STATS: TodayStats = {
  patientsToday: 0,
  queueWaiting: 0,
  queueInProgress: 0,
  appointmentsToday: 0,
  appointmentsCompleted: 0,
  tasksPending: 0,
  averageWaitTime: 0,
};

export function useMSPDashboard(): UseMSPDashboardResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const [todayStats, setTodayStats] = useState<TodayStats>(DEFAULT_STATS);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!structureId) return;

    try {
      const [stats, weekly, recent] = await Promise.all([
        getTodayStats(structureId),
        getWeeklyActivity(structureId),
        getRecentActivity(structureId, 10),
      ]);

      setTodayStats(stats);
      setWeeklyActivity(weekly);
      setRecentActivity(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (structureLoading || !structureId) return;

    // Initial fetch
    fetchAllData();

    // Auto refresh every 30 seconds
    intervalRef.current = setInterval(fetchAllData, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [structureId, structureLoading, fetchAllData]);

  return {
    todayStats,
    weeklyActivity,
    recentActivity,
    loading: loading || structureLoading,
    refresh: fetchAllData,
  };
}
