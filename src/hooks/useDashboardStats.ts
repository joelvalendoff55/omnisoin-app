"use client";

import { useEffect, useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';

export interface DashboardStats {
  inboxUnassigned: number;
  transcriptsUploaded: number;
  transcriptsReady: number;
  patientsActive: number;
  loading: boolean;
}

export function useDashboardStats() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [stats, setStats] = useState<DashboardStats>({
    inboxUnassigned: 0,
    transcriptsUploaded: 0,
    transcriptsReady: 0,
    patientsActive: 0,
    loading: true,
  });

  useEffect(() => {
    if (structureLoading || !structureId) return;

    const fetchStats = async () => {
      try {
        // Fetch all stats in parallel
        const [inboxRes, transcriptsUploadedRes, transcriptsReadyRes, patientsRes] = await Promise.all([
          // Inbox unassigned count
          supabase
            .from('inbox_messages')
            .select('id', { count: 'exact', head: true })
            .eq('structure_id', structureId)
            .is('patient_id', null),
          
          // Transcripts uploaded (pending)
          supabase
            .from('patient_transcripts')
            .select('id', { count: 'exact', head: true })
            .eq('structure_id', structureId)
            .eq('status', 'uploaded'),
          
          // Transcripts ready
          supabase
            .from('patient_transcripts')
            .select('id', { count: 'exact', head: true })
            .eq('structure_id', structureId)
            .eq('status', 'ready'),
          
          // Active patients (non-archived)
          supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('structure_id', structureId)
            .or('is_archived.is.null,is_archived.eq.false'),
        ]);

        setStats({
          inboxUnassigned: inboxRes.count || 0,
          transcriptsUploaded: transcriptsUploadedRes.count || 0,
          transcriptsReady: transcriptsReadyRes.count || 0,
          patientsActive: patientsRes.count || 0,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [structureId, structureLoading]);

  return stats;
}
