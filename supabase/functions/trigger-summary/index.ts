import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummaryRequestPayload {
  type: "summary_request" | "ping";
  summary_id?: string;
  structure_id?: string;
  transcript_id?: string;
  patient_id?: string;
  requested_by?: string;
  requested_at?: string;
  lang?: string;
  options?: {
    format: string;
    max_tokens: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the payload
    const payload: SummaryRequestPayload = await req.json();
    console.log('Received payload:', JSON.stringify(payload));

    // Read n8n secrets from environment (without VITE_ prefix)
    const webhookUrl = Deno.env.get('N8N_SUMMARY_WEBHOOK');
    const n8nToken = Deno.env.get('N8N_TOKEN');
    
    console.log('N8N config check:', {
      webhookConfigured: Boolean(webhookUrl),
      tokenConfigured: Boolean(n8nToken),
      tokenLength: n8nToken?.length || 0,
    });

    // Handle ping request - just check if webhook is configured
    if (payload.type === 'ping') {
      const configured = Boolean(webhookUrl);
      const tokenConfigured = Boolean(n8nToken);
      
      if (!configured) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            configured: false,
            tokenConfigured,
            message: 'Webhook n8n non configuré côté serveur' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try a quick connection test to n8n (HEAD or minimal request)
      try {
        const n8nHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (n8nToken) {
          n8nHeaders['Authorization'] = n8nToken.startsWith('Bearer ') 
            ? n8nToken 
            : `Bearer ${n8nToken}`;
        }

        const testResponse = await fetch(webhookUrl!, {
          method: 'POST',
          headers: n8nHeaders,
          body: JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }),
        });

        return new Response(
          JSON.stringify({ 
            success: testResponse.ok, 
            configured: true,
            tokenConfigured,
            status: testResponse.status,
            message: testResponse.ok ? 'Connexion n8n OK' : `Erreur n8n: ${testResponse.status}` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (pingError) {
        const pingMessage = pingError instanceof Error ? pingError.message : 'Erreur réseau';
        return new Response(
          JSON.stringify({ 
            success: false, 
            configured: true,
            tokenConfigured,
            message: `Erreur connexion: ${pingMessage}` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For summary_request, webhook must be configured
    if (!webhookUrl) {
      console.error('N8N webhook URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured', configured: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling n8n webhook:', webhookUrl);

    // Build headers for n8n call - ALWAYS include Authorization if token is configured
    const n8nHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (n8nToken) {
      // n8n Header Auth attend le token brut dans Authorization (sans préfixe Bearer)
      n8nHeaders['Authorization'] = n8nToken;
      
      console.log('Auth header configured:', {
        hasAuthorization: true,
        tokenLength: n8nToken.length,
      });
    } else {
      console.warn('N8N_TOKEN not configured - request will be unauthenticated');
    }

    // Call n8n webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: n8nHeaders,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('N8N response status:', response.status);
    console.log('N8N response body:', responseText);

    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'Webhook call failed',
          status: response.status,
          details: responseData,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in trigger-summary function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
