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
    // Get 3CX configuration from environment (secrets)
    const baseUrl = Deno.env.get("3CX_BASE_URL");
    const clientId = Deno.env.get("3CX_CLIENT_ID");
    const clientSecret = Deno.env.get("3CX_CLIENT_SECRET");

    // Check if secrets are configured
    if (!baseUrl || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: "Secrets 3CX non configurés (3CX_BASE_URL, 3CX_CLIENT_ID, 3CX_CLIENT_SECRET)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Attempt to authenticate with 3CX API
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

    if (authResponse.ok) {
      // Mask the base URL for security (show only domain)
      const url = new URL(baseUrl);
      const maskedUrl = `${url.protocol}//${url.hostname}`;

      return new Response(
        JSON.stringify({
          success: true,
          configured: true,
          baseUrl: maskedUrl,
          message: "Connexion 3CX établie avec succès",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      const errorText = await authResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          configured: true,
          baseUrl: baseUrl.replace(/\/\/.*@/, "//***@"), // Mask credentials if any
          error: `Erreur d'authentification: ${authResponse.status} - ${errorText.substring(0, 100)}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    
    return new Response(
      JSON.stringify({
        success: false,
        configured: true,
        error: `Erreur de connexion: ${message}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
