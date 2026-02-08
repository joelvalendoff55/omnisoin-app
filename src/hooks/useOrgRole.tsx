"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type OrgRole = 'owner' | 'admin' | 'coordinator' | 'doctor' | 'ipa' | 'nurse' | 'assistant' | 'viewer';

interface UseOrgRoleResult {
  orgRole: OrgRole | null;
  loading: boolean;
  error: Error | null;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  isOrgAdminOrOwner: boolean;
}

export function useOrgRole(): UseOrgRoleResult {
  const { user } = useAuth();
  const { structureId, loading: structureLoading } = useStructureId();
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOrgRole = async () => {
      if (!user) {
        setOrgRole(null);
        setError(null);
        setLoading(false);
        return;
      }

      if (structureLoading) {
        setLoading(true);
        return;
      }

      if (!structureId) {
        setOrgRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('org_members')
          .select('org_role')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .eq('is_active', true)
          .is('archived_at', null)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No row found - user is not a member
            setOrgRole(null);
          } else {
            throw fetchError;
          }
        } else {
          setOrgRole(data?.org_role as OrgRole || null);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching org role:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setOrgRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgRole();
  }, [user, structureId, structureLoading]);

  const computedValues = useMemo(() => ({
    isOrgAdmin: orgRole === 'admin',
    isOrgOwner: orgRole === 'owner',
    isOrgAdminOrOwner: orgRole === 'admin' || orgRole === 'owner',
  }), [orgRole]);

  return {
    orgRole,
    loading: user ? loading || structureLoading : false,
    error,
    ...computedValues,
  };
}
