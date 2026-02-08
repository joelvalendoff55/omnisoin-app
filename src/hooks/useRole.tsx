"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UseRoleResult {
  roles: AppRole[];
  loading: boolean;
  error: Error | null;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isPractitioner: boolean;
  isAssistant: boolean;
}

export function useRole(): UseRoleResult {
  const { user } = useAuth();
  const { structureId, loading: structureLoading } = useStructureId();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      // IMPORTANT: if not authenticated, never keep the hook in a loading state
      if (!user) {
        setRoles([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (structureLoading) {
        setLoading(true);
        return;
      }

      if (!structureId) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .eq('is_active', true);

        if (fetchError) {
          throw fetchError;
        }

        const userRoles = data?.map((r) => r.role) || [];
        setRoles(userRoles);
        setError(null);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user, structureId, structureLoading]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const computedValues = useMemo(() => ({
    isAdmin: roles.includes('admin'),
    isCoordinator: roles.includes('coordinator'),
    isPractitioner: roles.includes('practitioner'),
    isAssistant: roles.includes('assistant'),
  }), [roles]);

  return {
    roles,
    loading: user ? loading || structureLoading : false,
    error,
    hasRole,
    ...computedValues,
  };
}
