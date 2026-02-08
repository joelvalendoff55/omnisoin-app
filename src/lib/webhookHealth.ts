/**
 * Webhook health check utilities
 * Tests connectivity to n8n webhooks via secure Edge Function proxy
 * 
 * SECURITY: All n8n secrets (N8N_SUMMARY_WEBHOOK, N8N_TOKEN) are stored server-side
 * and accessed only through the trigger-summary Edge Function.
 */

import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface WebhookTestResult {
  ok: boolean;
  status: number;
  message: string;
  errorType?: 'auth' | 'not_found' | 'timeout' | 'network' | 'server' | 'not_configured';
  configured?: boolean;
  tokenConfigured?: boolean;
}

/**
 * Test n8n webhook connectivity via secure Edge Function
 * Does NOT expose any secrets to the client
 */
export async function testN8nWebhook(): Promise<WebhookTestResult> {
  try {
    const { data, error } = await supabase.functions.invoke('trigger-summary', {
      body: {
        type: 'ping',
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      // Handle edge function invocation errors
      const errorMessage = error.message || 'Erreur inconnue';
      
      // Check for specific error types
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return {
          ok: false,
          status: 401,
          message: 'Non autorisé - veuillez vous connecter',
          errorType: 'auth',
        };
      }
      
      return {
        ok: false,
        status: 0,
        message: `Erreur: ${errorMessage}`,
        errorType: 'server',
      };
    }

    // Parse response from edge function
    if (!data) {
      return {
        ok: false,
        status: 0,
        message: 'Réponse vide du serveur',
        errorType: 'server',
      };
    }

    // Check configuration status from edge function response
    if (data.configured === false) {
      return {
        ok: false,
        status: 0,
        message: data.message || 'Webhook n8n non configuré côté serveur',
        errorType: 'not_configured',
        configured: false,
        tokenConfigured: data.tokenConfigured,
      };
    }

    // Return successful or failed connection test result
    return {
      ok: data.success === true,
      status: data.status || (data.success ? 200 : 0),
      message: data.message || (data.success ? 'Connexion réussie' : 'Échec de connexion'),
      errorType: data.success ? undefined : 'server',
      configured: data.configured,
      tokenConfigured: data.tokenConfigured,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    // Detect timeout/network errors
    const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                      errorMessage.toLowerCase().includes('aborted');
    
    return {
      ok: false,
      status: 0,
      message: isTimeout ? 'n8n indisponible (timeout)' : `Erreur réseau: ${errorMessage}`,
      errorType: isTimeout ? 'timeout' : 'network',
    };
  }
}

/**
 * Check if n8n webhook is configured (server-side check)
 * Returns true if the webhook is configured, even if connection fails
 */
export async function isN8nWebhookConfigured(): Promise<boolean> {
  try {
    const result = await testN8nWebhook();
    // Configured if result says so, or if we got a response (even failure means configured)
    return result.configured !== false;
  } catch {
    // If we can't reach the edge function, assume not configured
    return false;
  }
}

/**
 * @deprecated Use isN8nWebhookConfigured() instead - this was client-side check
 * Kept for backwards compatibility but always returns false for security
 */
export function isN8nSummaryWebhookConfigured(): boolean {
  console.warn('isN8nSummaryWebhookConfigured() is deprecated. Use isN8nWebhookConfigured() instead.');
  // Always return false - secrets should not be in client-side env
  return false;
}

/**
 * @deprecated Use isN8nWebhookConfigured() instead - this was client-side check
 * Kept for backwards compatibility but always returns false for security
 */
export function isN8nTokenConfigured(): boolean {
  console.warn('isN8nTokenConfigured() is deprecated. Use isN8nWebhookConfigured() instead.');
  // Always return false - secrets should not be in client-side env
  return false;
}

/**
 * @deprecated Webhook URL is now hidden server-side for security
 * Kept for backwards compatibility but returns null
 */
export function getMaskedWebhookUrl(): string | null {
  console.warn('getMaskedWebhookUrl() is deprecated. Webhook URL is now server-side only.');
  return null;
}
