import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';

export type MFAStatus = 'not_enrolled' | 'enrolled' | 'verified' | 'loading';

interface UseMFAResult {
  status: MFAStatus;
  loading: boolean;
  factors: Array<{ id: string; type: string; friendly_name?: string }>;
  enrollTOTP: () => Promise<{ qrCode: string; secret: string; factorId: string } | null>;
  verifyTOTP: (code: string, factorId: string) => Promise<{ success: boolean; error?: string }>;
  challengeAndVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
  unenroll: (factorId: string) => Promise<{ success: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
}

export function useMFA(): UseMFAResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<MFAStatus>('loading');
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Array<{ id: string; type: string; friendly_name?: string }>>([]);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setStatus('not_enrolled');
      setFactors([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error listing MFA factors:', error);
        setStatus('not_enrolled');
        setLoading(false);
        return;
      }

      const totpFactors = data?.totp || [];
      setFactors(totpFactors.map(f => ({ 
        id: f.id, 
        type: f.factor_type,
        friendly_name: f.friendly_name 
      })));

      if (totpFactors.length === 0) {
        setStatus('not_enrolled');
      } else {
        // Check if current session has MFA verified
        const { data: aals } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aals?.currentLevel === 'aal2') {
          setStatus('verified');
        } else {
          setStatus('enrolled');
        }
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
      setStatus('not_enrolled');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const enrollTOTP = async (): Promise<{ qrCode: string; secret: string; factorId: string } | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Application Authenticator',
      });

      if (error) {
        console.error('Error enrolling TOTP:', error);
        return null;
      }

      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      };
    } catch (err) {
      console.error('Error enrolling TOTP:', err);
      return null;
    }
  };

  const verifyTOTP = async (code: string, factorId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        return { success: false, error: challengeError.message };
      }

      // Then verify with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      await refreshStatus();
      return { success: true };
    } catch (err) {
      console.error('Error verifying TOTP:', err);
      return { success: false, error: 'Erreur lors de la vérification' };
    }
  };

  const challengeAndVerify = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (factors.length === 0) {
      return { success: false, error: 'Aucun facteur MFA configuré' };
    }

    const factorId = factors[0].id;
    return verifyTOTP(code, factorId);
  };

  const unenroll = async (factorId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshStatus();
      return { success: true };
    } catch (err) {
      console.error('Error unenrolling MFA:', err);
      return { success: false, error: 'Erreur lors de la suppression' };
    }
  };

  return {
    status,
    loading,
    factors,
    enrollTOTP,
    verifyTOTP,
    challengeAndVerify,
    unenroll,
    refreshStatus,
  };
}

export function useMFARequired(): { mfaRequired: boolean; loading: boolean } {
  const { user } = useAuth();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMFARequired = async () => {
      if (!user) {
        setMfaRequired(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has admin or practitioner role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const userRoles = roles?.map(r => r.role) || [];
        const requiresMFA = userRoles.includes('admin') || userRoles.includes('practitioner');

        // Also check if mfa_required feature flag is enabled
        const { data: flagData } = await supabase
          .from('feature_flags')
          .select('is_enabled')
          .eq('flag_name', 'mfa_required')
          .maybeSingle();

        const flagEnabled = flagData?.is_enabled ?? false;

        setMfaRequired(requiresMFA && flagEnabled);
      } catch (err) {
        console.error('Error checking MFA requirement:', err);
        setMfaRequired(false);
      } finally {
        setLoading(false);
      }
    };

    checkMFARequired();
  }, [user]);

  return { mfaRequired, loading };
}
