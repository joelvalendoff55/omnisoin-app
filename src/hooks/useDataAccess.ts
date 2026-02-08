"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import {
  DataAccessLog,
  IsolationStatus,
  StructureIsolationAlert,
  EncryptedFieldInfo,
  fetchDataAccessLogs,
  fetchIsolationStatus,
  fetchIsolationAlerts,
  fetchEncryptedFields,
  getDataAccessStats,
  resolveIsolationAlert,
  logDataAccess,
  DataAccessAction,
} from '@/lib/dataAccess';

interface DataAccessStats {
  totalAccesses: number;
  accessesToday: number;
  accessesLast7Days: number;
  decryptions: number;
  exports: number;
}

interface UseDataAccessResult {
  // Data access logs
  logs: DataAccessLog[];
  logsCount: number;
  logsLoading: boolean;
  logsError: Error | null;
  refetchLogs: () => Promise<void>;
  
  // Isolation status
  isolationStatus: IsolationStatus | null;
  isolationStatusLoading: boolean;
  
  // Isolation alerts
  alerts: StructureIsolationAlert[];
  alertsCount: number;
  alertsLoading: boolean;
  resolveAlert: (alertId: string) => Promise<void>;
  
  // Encrypted fields
  encryptedFields: EncryptedFieldInfo[];
  fieldsLoading: boolean;
  
  // Stats
  stats: DataAccessStats | null;
  statsLoading: boolean;
  
  // Actions
  logAccess: (
    resourceType: string,
    resourceId: string,
    actionType: DataAccessAction,
    fieldsAccessed: string[],
    accessReason: string,
    accessReasonCategory?: string
  ) => Promise<string | null>;
}

export function useDataAccess(): UseDataAccessResult {
  const { structureId } = useStructureId();
  
  // Data access logs
  const [logs, setLogs] = useState<DataAccessLog[]>([]);
  const [logsCount, setLogsCount] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<Error | null>(null);
  
  // Isolation status
  const [isolationStatus, setIsolationStatus] = useState<IsolationStatus | null>(null);
  const [isolationStatusLoading, setIsolationStatusLoading] = useState(true);
  
  // Isolation alerts
  const [alerts, setAlerts] = useState<StructureIsolationAlert[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(true);
  
  // Encrypted fields
  const [encryptedFields, setEncryptedFields] = useState<EncryptedFieldInfo[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  
  // Stats
  const [stats, setStats] = useState<DataAccessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch logs
  const refetchLogs = useCallback(async () => {
    if (!structureId) return;
    
    try {
      setLogsLoading(true);
      const result = await fetchDataAccessLogs({ limit: 100 });
      setLogs(result.logs);
      setLogsCount(result.count);
      setLogsError(null);
    } catch (err) {
      setLogsError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLogsLoading(false);
    }
  }, [structureId]);

  // Fetch isolation status
  const fetchIsolationStatusData = useCallback(async () => {
    if (!structureId) return;
    
    try {
      setIsolationStatusLoading(true);
      const status = await fetchIsolationStatus(structureId);
      setIsolationStatus(status);
    } finally {
      setIsolationStatusLoading(false);
    }
  }, [structureId]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    if (!structureId) return;
    
    try {
      setAlertsLoading(true);
      const result = await fetchIsolationAlerts({ limit: 50 });
      setAlerts(result.alerts);
      setAlertsCount(result.count);
    } finally {
      setAlertsLoading(false);
    }
  }, [structureId]);

  // Fetch encrypted fields
  const fetchFields = useCallback(async () => {
    try {
      setFieldsLoading(true);
      const fields = await fetchEncryptedFields();
      setEncryptedFields(fields);
    } finally {
      setFieldsLoading(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!structureId) return;
    
    try {
      setStatsLoading(true);
      const statsData = await getDataAccessStats(structureId);
      setStats(statsData);
    } finally {
      setStatsLoading(false);
    }
  }, [structureId]);

  // Resolve alert
  const handleResolveAlert = useCallback(async (alertId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await resolveIsolationAlert(alertId, user.id);
    await fetchAlerts();
    await fetchIsolationStatusData();
  }, [fetchAlerts, fetchIsolationStatusData]);

  // Log access helper
  const handleLogAccess = useCallback(async (
    resourceType: string,
    resourceId: string,
    actionType: DataAccessAction,
    fieldsAccessed: string[],
    accessReason: string,
    accessReasonCategory: string = 'consultation'
  ): Promise<string | null> => {
    const result = await logDataAccess(
      resourceType,
      resourceId,
      actionType,
      fieldsAccessed,
      accessReason,
      accessReasonCategory
    );
    
    // Refresh stats after logging
    await fetchStats();
    
    return result;
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    if (structureId) {
      refetchLogs();
      fetchIsolationStatusData();
      fetchAlerts();
      fetchStats();
    }
    fetchFields();
  }, [structureId, refetchLogs, fetchIsolationStatusData, fetchAlerts, fetchFields, fetchStats]);

  // Set up realtime subscription for data access logs
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('data_access_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'data_access_log',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          refetchLogs();
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'structure_isolation_alerts',
          filter: `source_structure_id=eq.${structureId}`,
        },
        () => {
          fetchAlerts();
          fetchIsolationStatusData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, refetchLogs, fetchStats, fetchAlerts, fetchIsolationStatusData]);

  return {
    logs,
    logsCount,
    logsLoading,
    logsError,
    refetchLogs,
    isolationStatus,
    isolationStatusLoading,
    alerts,
    alertsCount,
    alertsLoading,
    resolveAlert: handleResolveAlert,
    encryptedFields,
    fieldsLoading,
    stats,
    statsLoading,
    logAccess: handleLogAccess,
  };
}
