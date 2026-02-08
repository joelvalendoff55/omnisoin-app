import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function to proxy PDF extraction requests to n8n webhook
 * 
 * SECURITY:
 * - Validates user authentication via JWT
 * - Keeps n8n webhook URL server-side only
 * - Adds audit logging for data extraction
 */
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
        JSON.stringify({ error: 'Non autorisé' }),
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
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get n8n webhook URL from server-side environment
    const webhookUrl = Deno.env.get('N8N_PDF_EXTRACT_WEBHOOK');
    const n8nToken = Deno.env.get('N8N_TOKEN');
    
    if (!webhookUrl) {
      console.error('N8N_PDF_EXTRACT_WEBHOOK not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Service d\'extraction non configuré',
          configured: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the form data from the request
    const contentType = req.headers.get('content-type') || '';
    
    let n8nResponse: Response;
    
    if (contentType.includes('multipart/form-data')) {
      // Forward the multipart form data to n8n
      const formData = await req.formData();
      
      // Build headers for n8n call
      const n8nHeaders: Record<string, string> = {};
      if (n8nToken) {
        n8nHeaders['Authorization'] = n8nToken;
      }
      
      console.log('Forwarding PDF to n8n webhook');
      
      n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: formData,
      });
    } else if (contentType.includes('application/json')) {
      // Handle JSON body (base64 encoded file)
      const body = await req.json();
      
      const n8nHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (n8nToken) {
        n8nHeaders['Authorization'] = n8nToken;
      }
      
      console.log('Forwarding base64 PDF to n8n webhook');
      
      n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: JSON.stringify(body),
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Content-Type non supporté' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseText = await n8nResponse.text();
    console.log('N8N response status:', n8nResponse.status);

    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Échec de l\'extraction',
          status: n8nResponse.status,
          details: responseData,
        }),
        { status: n8nResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Error in extract-patient-pdf function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
