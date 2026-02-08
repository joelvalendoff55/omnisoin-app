import { useEffect, useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';

export interface TodoInboxItem {
  id: string;
  type: 'inbox';
  sender_phone: string | null;
  text_body: string | null;
  created_at: string;
}

export interface TodoTranscriptItem {
  id: string;
  type: 'transcript';
  patient_name: string;
  patient_id: string;
  created_at: string;
}

export type TodoItem = TodoInboxItem | TodoTranscriptItem;

export function useTodoItems() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [inboxItems, setInboxItems] = useState<TodoInboxItem[]>([]);
  const [transcriptItems, setTranscriptItems] = useState<TodoTranscriptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (structureLoading || !structureId) return;

    const fetchTodoItems = async () => {
      try {
        // Fetch unassigned inbox messages
        const { data: inboxData } = await supabase
          .from('inbox_messages')
          .select('id, sender_phone, text_body, created_at')
          .eq('structure_id', structureId)
          .is('patient_id', null)
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch uploaded transcripts
        const { data: transcriptData } = await supabase
          .from('patient_transcripts')
          .select(`
            id,
            created_at,
            patient_id,
            patients (
              first_name,
              last_name
            )
          `)
          .eq('structure_id', structureId)
          .eq('status', 'uploaded')
          .order('created_at', { ascending: false })
          .limit(5);

        setInboxItems(
          (inboxData || []).map((item) => ({
            ...item,
            type: 'inbox' as const,
          }))
        );

        setTranscriptItems(
          (transcriptData || []).map((item: any) => ({
            id: item.id,
            type: 'transcript' as const,
            patient_name: item.patients
              ? `${item.patients.first_name} ${item.patients.last_name}`
              : 'Patient inconnu',
            patient_id: item.patient_id,
            created_at: item.created_at,
          }))
        );
      } catch (error) {
        console.error('Error fetching todo items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodoItems();
  }, [structureId, structureLoading]);

  return { inboxItems, transcriptItems, loading };
}
