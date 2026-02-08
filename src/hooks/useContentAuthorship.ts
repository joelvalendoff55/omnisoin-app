"use client";

import { useState, useCallback, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

export type SourceType = 'ai_generated' | 'human_created' | 'human_modified' | 'ai_assisted';
export type EntityType = 'consultation' | 'anamnesis' | 'prescription' | 'document' | 'note';

export interface AuthorshipEntry {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  field_name: string;
  source_type: SourceType;
  ai_model?: string | null;
  ai_confidence?: number | null;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  content_snapshot?: string | null;
  content_hash?: string | null;
  version_number: number;
  structure_id: string;
  patient_id?: string | null;
  created_at: string;
}

interface LogAuthorshipParams {
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  sourceType: SourceType;
  content: string;
  patientId?: string;
  structureId: string;
  aiModel?: string;
  aiConfidence?: number;
}

interface UseContentAuthorshipReturn {
  logAuthorship: (params: LogAuthorshipParams) => Promise<AuthorshipEntry | null>;
  getAuthorshipHistory: (entityType: EntityType, entityId: string, fieldName?: string) => Promise<AuthorshipEntry[]>;
  getLatestAuthorship: (entityType: EntityType, entityId: string, fieldName: string) => Promise<AuthorshipEntry | null>;
  loading: boolean;
}

// Simple hash function for content integrity
async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

export function useContentAuthorship(): UseContentAuthorshipReturn {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user } = useAuth();
  const { isPractitioner, roles } = useRole();

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const primaryRole = roles[0] || 'unknown';

  const getActorName = useCallback((): string => {
    if (!profile) return 'Utilisateur inconnu';
    const prefix = isPractitioner ? 'Dr ' : '';
    return `${prefix}${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur';
  }, [profile, isPractitioner]);

  const logAuthorship = useCallback(async (params: LogAuthorshipParams): Promise<AuthorshipEntry | null> => {
    if (!user) {
      console.error('No user logged in for authorship logging');
      return null;
    }

    setLoading(true);
    try {
      const contentHash = await computeContentHash(params.content);
      
      const { data, error } = await (supabase
        .from('content_authorship_log' as any)
        .insert({
          entity_type: params.entityType,
          entity_id: params.entityId,
          field_name: params.fieldName,
          source_type: params.sourceType,
          ai_model: params.aiModel || null,
          ai_confidence: params.aiConfidence || null,
          actor_user_id: user.id,
          actor_name: getActorName(),
          actor_role: primaryRole,
          content_snapshot: params.content.substring(0, 5000),
          content_hash: contentHash,
          structure_id: params.structureId,
          patient_id: params.patientId || null,
        })
        .select()
        .single()) as { data: AuthorshipEntry | null; error: any };

      if (error) {
        console.error('Error logging authorship:', error);
        return null;
      }

      return data as AuthorshipEntry;
    } catch (error) {
      console.error('Error in logAuthorship:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, primaryRole, getActorName]);

  const getAuthorshipHistory = useCallback(async (
    entityType: EntityType,
    entityId: string,
    fieldName?: string
  ): Promise<AuthorshipEntry[]> => {
    setLoading(true);
    try {
      let query = supabase
        .from('content_authorship_log' as any)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('version_number', { ascending: false });

      if (fieldName) {
        query = query.eq('field_name', fieldName);
      }

      const { data, error } = await query as { data: AuthorshipEntry[] | null; error: any };

      if (error) {
        console.error('Error fetching authorship history:', error);
        return [];
      }

      return (data || []) as AuthorshipEntry[];
    } catch (error) {
      console.error('Error in getAuthorshipHistory:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getLatestAuthorship = useCallback(async (
    entityType: EntityType,
    entityId: string,
    fieldName: string
  ): Promise<AuthorshipEntry | null> => {
    try {
      const { data, error } = await (supabase
        .from('content_authorship_log' as any)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('field_name', fieldName)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: AuthorshipEntry | null; error: any };

      if (error) {
        console.error('Error fetching latest authorship:', error);
        return null;
      }

      return data as AuthorshipEntry | null;
    } catch (error) {
      console.error('Error in getLatestAuthorship:', error);
      return null;
    }
  }, []);

  return {
    logAuthorship,
    getAuthorshipHistory,
    getLatestAuthorship,
    loading,
  };
}
