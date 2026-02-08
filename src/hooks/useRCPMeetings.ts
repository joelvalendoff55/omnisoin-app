import { useState, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';

export interface RCPMeeting {
  id: string;
  structure_id: string;
  title: string;
  meeting_date: string;
  participants: string[];
  patient_ids: string[];
  notes: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useRCPMeetings() {
  const { structureId, loading: structureLoading } = useStructureId();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<RCPMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMeetings = async () => {
    if (!structureId) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('rcp_meetings')
        .select('*')
        .eq('structure_id', structureId)
        .order('meeting_date', { ascending: true });

      if (fetchError) throw fetchError;

      setMeetings((data as RCPMeeting[]) || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching RCP meetings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!structureLoading) {
      fetchMeetings();
    }
  }, [structureId, structureLoading]);

  // Set up realtime subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('rcp_meetings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rcp_meetings',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchMeetings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId]);

  const createMeeting = async (meeting: Omit<RCPMeeting, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'structure_id'>) => {
    if (!structureId || !user) throw new Error('Missing structure or user');

    const { error } = await supabase
      .from('rcp_meetings')
      .insert({
        ...meeting,
        structure_id: structureId,
        created_by: user.id,
      });

    if (error) throw error;
  };

  const updateMeeting = async (id: string, updates: Partial<RCPMeeting>) => {
    const { error } = await supabase
      .from('rcp_meetings')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase
      .from('rcp_meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return {
    meetings,
    loading: loading || structureLoading,
    error,
    refetch: fetchMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}
