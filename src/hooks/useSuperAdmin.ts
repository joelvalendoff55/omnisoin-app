import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

interface UseSuperAdminResult {
  isSuperAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

export function useSuperAdmin(): UseSuperAdminResult {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          // If error is about RLS (user not super admin), that's expected
          if (fetchError.code === 'PGRST116') {
            setIsSuperAdmin(false);
          } else {
            throw fetchError;
          }
        } else {
          setIsSuperAdmin(!!data);
        }
        setError(null);
      } catch (err) {
        console.error('Error checking super admin status:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  return { isSuperAdmin, loading, error };
}
