import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, patientId, patientName } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Numéro de téléphone requis",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get 3CX configuration from environment (secrets)
    const baseUrl = Deno.env.get("3CX_BASE_URL");
    const clientId = Deno.env.get("3CX_CLIENT_ID");
    const clientSecret = Deno.env.get("3CX_CLIENT_SECRET");
    const extension = Deno.env.get("3CX_EXTENSION") || "100";

    // Check if secrets are configured
    if (!baseUrl || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          message: "3CX non configuré - utilisez le protocole tel: en fallback",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate with 3CX API
    const authUrl = `${baseUrl}/connect/token`;
    
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: true,
          error: "Erreur d'authentification 3CX",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Initiate call via 3CX API
    // Note: The actual endpoint depends on your 3CX version and configuration
    const callUrl = `${baseUrl}/api/calls/make`;
    
    const callResponse = await fetch(callUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: extension,
        to: phoneNumber,
        // Optional metadata
        metadata: {
          patientId,
          patientName,
          initiatedAt: new Date().toISOString(),
        },
      }),
    });

    if (callResponse.ok) {
      console.log(`Call initiated: ${extension} -> ${phoneNumber} (Patient: ${patientName || 'N/A'})`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Appel initié avec succès",
          phoneNumber,
          extension,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      const errorText = await callResponse.text();
      console.error(`3CX call failed: ${errorText}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          configured: true,
          error: "Erreur lors de l'initiation de l'appel",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Error initiating call:", message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erreur: ${message}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
