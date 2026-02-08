import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type ConsentType = 
  | 'health_data'
  | 'terms_of_service'
  | 'privacy_policy'
  | 'cookies_analytics'
  | 'cookies_marketing'
  | 'clinical_aid_disclaimer';

export interface ConsentRecord {
  user_id: string;
  consent_type: ConsentType;
  consent_version: string;
  granted: boolean;
  ip_address?: string;
  user_agent?: string;
  metadata?: Json;
}

/**
 * Record a user consent
 */
export async function recordConsent(consent: ConsentRecord): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('user_consents').insert({
      user_id: consent.user_id,
      consent_type: consent.consent_type,
      consent_version: consent.consent_version,
      granted: consent.granted,
      granted_at: consent.granted ? new Date().toISOString() : null,
      ip_address: consent.ip_address,
      user_agent: consent.user_agent,
      metadata: consent.metadata || {},
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error recording consent:', error);
    return { error: error as Error };
  }
}

/**
 * Revoke a consent
 */
export async function revokeConsent(
  userId: string, 
  consentType: ConsentType
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .is('revoked_at', null);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error revoking consent:', error);
    return { error: error as Error };
  }
}

/**
 * Check if user has given a specific consent
 */
export async function hasConsent(
  userId: string, 
  consentType: ConsentType
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('id')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .is('revoked_at', null)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking consent:', error);
      return false;
    }

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get all active consents for a user
 */
export async function getUserConsents(userId: string): Promise<ConsentType[]> {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('consent_type')
      .eq('user_id', userId)
      .eq('granted', true)
      .is('revoked_at', null);

    if (error) throw error;
    return (data || []).map(c => c.consent_type as ConsentType);
  } catch (error) {
    console.error('Error fetching user consents:', error);
    return [];
  }
}

/**
 * Record signup consents (health data + terms + privacy)
 */
export async function recordSignupConsents(
  userId: string,
  metadata?: { ip_address?: string; user_agent?: string }
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('user_consents').insert([
      {
        user_id: userId,
        consent_type: 'health_data',
        consent_version: '1.0',
        granted: true,
        granted_at: new Date().toISOString(),
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
      },
      {
        user_id: userId,
        consent_type: 'terms_of_service',
        consent_version: '1.0',
        granted: true,
        granted_at: new Date().toISOString(),
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
      },
      {
        user_id: userId,
        consent_type: 'privacy_policy',
        consent_version: '1.0',
        granted: true,
        granted_at: new Date().toISOString(),
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
      },
    ]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error recording signup consents:', error);
    return { error: error as Error };
  }
}
