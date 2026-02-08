"use client";

import { useState, useCallback, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { useDebouncedCallback } from '@/hooks/useDebounce';

export interface SearchResultPatient {
  id: string;
  type: 'patient';
  first_name: string;
  last_name: string;
  phone: string | null;
}

export interface SearchResultTranscript {
  id: string;
  type: 'transcript';
  patient_name: string;
  patient_id: string;
  excerpt: string;
  created_at: string;
}

export interface SearchResultInbox {
  id: string;
  type: 'inbox';
  sender_phone: string | null;
  text_body: string | null;
  created_at: string;
}

export interface SearchResultDocument {
  id: string;
  type: 'document';
  title: string;
  patient_name: string;
  patient_id: string;
  created_at: string;
}

export interface SearchResultTask {
  id: string;
  type: 'task';
  title: string;
  description: string | null;
  status: string;
  patient_name: string | null;
  created_at: string;
}

export interface SearchResults {
  patients: SearchResultPatient[];
  transcripts: SearchResultTranscript[];
  inbox: SearchResultInbox[];
  documents: SearchResultDocument[];
  tasks: SearchResultTask[];
}

export function useGlobalSearch() {
  const { structureId } = useStructureId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    patients: [],
    transcripts: [],
    inbox: [],
    documents: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !structureId) {
        setResults({ patients: [], transcripts: [], inbox: [], documents: [], tasks: [] });
        setLoading(false);
        return;
      }

      setLoading(true);
      const searchTerm = `%${searchQuery.trim()}%`;

      try {
        const [patientsRes, transcriptsRes, inboxRes, documentsRes, tasksRes] = await Promise.all([
          // Search patients
          supabase
            .from('patients')
            .select('id, first_name, last_name, phone')
            .eq('structure_id', structureId)
            .or('is_archived.is.null,is_archived.eq.false')
            .or(
              `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`
            )
            .limit(5),

          // Search transcripts by text
          supabase
            .from('patient_transcripts')
            .select(`
              id,
              transcript_text,
              created_at,
              patient_id,
              patients (
                first_name,
                last_name
              )
            `)
            .eq('structure_id', structureId)
            .ilike('transcript_text', searchTerm)
            .limit(5),

          // Search inbox by text_body or sender_phone
          supabase
            .from('inbox_messages')
            .select('id, sender_phone, text_body, created_at')
            .eq('structure_id', structureId)
            .or(`text_body.ilike.${searchTerm},sender_phone.ilike.${searchTerm}`)
            .limit(5),

          // Search documents by title
          supabase
            .from('documents')
            .select(`
              id,
              title,
              created_at,
              patient_id,
              patients (
                first_name,
                last_name
              )
            `)
            .eq('structure_id', structureId)
            .ilike('title', searchTerm)
            .limit(5),

          // Search tasks by title or description
          supabase
            .from('tasks')
            .select(`
              id,
              title,
              description,
              status,
              created_at,
              patient_id,
              patients (
                first_name,
                last_name
              )
            `)
            .eq('structure_id', structureId)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
        ]);

        setResults({
          patients: (patientsRes.data || []).map((p) => ({
            ...p,
            type: 'patient' as const,
          })),
          transcripts: (transcriptsRes.data || []).map((t: any) => ({
            id: t.id,
            type: 'transcript' as const,
            patient_name: t.patients
              ? `${t.patients.first_name} ${t.patients.last_name}`
              : 'Patient inconnu',
            patient_id: t.patient_id,
            excerpt:
              t.transcript_text?.substring(0, 100) + (t.transcript_text?.length > 100 ? '...' : '') ||
              '',
            created_at: t.created_at,
          })),
          inbox: (inboxRes.data || []).map((i) => ({
            ...i,
            type: 'inbox' as const,
          })),
          documents: (documentsRes.data || []).map((d: any) => ({
            id: d.id,
            type: 'document' as const,
            title: d.title,
            patient_name: d.patients
              ? `${d.patients.first_name} ${d.patients.last_name}`
              : 'Patient inconnu',
            patient_id: d.patient_id,
            created_at: d.created_at,
          })),
          tasks: (tasksRes.data || []).map((t: any) => ({
            id: t.id,
            type: 'task' as const,
            title: t.title,
            description: t.description,
            status: t.status,
            patient_name: t.patients
              ? `${t.patients.first_name} ${t.patients.last_name}`
              : null,
            created_at: t.created_at,
          })),
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    },
    [structureId]
  );

  const debouncedSearch = useDebouncedCallback(performSearch, 300);

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setResults({ patients: [], transcripts: [], inbox: [], documents: [], tasks: [] });
    }
  }, [query, debouncedSearch]);

  const hasResults =
    results.patients.length > 0 ||
    results.transcripts.length > 0 ||
    results.inbox.length > 0 ||
    results.documents.length > 0 ||
    results.tasks.length > 0;

  return {
    query,
    setQuery,
    results,
    loading,
    isOpen,
    setIsOpen,
    hasResults,
  };
}
