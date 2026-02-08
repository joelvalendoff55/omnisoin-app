import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

interface UseStructureIdResult {
  structureId: string | null;
  loading: boolean;
  error: Error | null;
}

export function useStructureId(): UseStructureIdResult {
  const { user } = useAuth();
  const [structureId, setStructureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStructureId = async () => {
      if (!user) {
        setStructureId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Read from org_members (primary source for structure membership)
        const { data, error: fetchError } = await supabase
          .from('org_members')
          .select('structure_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        setStructureId(data?.structure_id || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching structure_id:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setStructureId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStructureId();
  }, [user]);

  return { structureId, loading, error };
}
