import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notionApiKey = Deno.env.get("NOTION_API_KEY");
    
    if (!notionApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "NOTION_API_KEY not configured" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for sync options
    const body = await req.json().catch(() => ({}));
    const { structureId, syncType = "indicators" } = body;

    if (!structureId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing structureId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch current ACI indicators from the database
    const { data: indicators, error: fetchError } = await supabase
      .from("aci_indicators")
      .select("*")
      .eq("structure_id", structureId);

    if (fetchError) {
      throw fetchError;
    }

    // Here you would implement the actual Notion sync logic
    // This is a placeholder that shows the structure is working
    // In production, you would:
    // 1. Fetch data from Notion using the API key
    // 2. Compare with local data
    // 3. Update local database with changes from Notion
    // 4. Or push local changes to Notion

    console.log(`Notion sync initiated for structure ${structureId}`);
    console.log(`Sync type: ${syncType}`);
    console.log(`Found ${indicators?.length || 0} local indicators`);

    // Simulated sync response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Sync avec Notion initiée",
        syncedAt: new Date().toISOString(),
        indicatorsCount: indicators?.length || 0,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Notion sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la synchronisation Notion";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
