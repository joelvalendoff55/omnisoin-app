import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SYSTEM_PROMPT = `Tu es OmniSoin Assist, l'assistant virtuel du portail patient OmniSoin. Tu es amical, professionnel et rassurant.

RÈGLES IMPORTANTES:
1. Tu ne donnes JAMAIS de conseils médicaux, diagnostics ou avis sur des symptômes
2. Pour toute question médicale, redirige vers la messagerie sécurisée avec l'équipe soignante
3. Tu aides uniquement pour:
   - Navigation dans le portail
   - Informations pratiques (horaires, préparation RDV, documents)
   - Prise de rendez-vous
   - Accès aux documents
   - Questions administratives

INFORMATIONS UTILES:
- Horaires d'ouverture: Du lundi au vendredi, 8h-19h. Samedi 9h-12h.
- Pour prendre RDV: Aller dans "Rendez-vous" puis "Nouveau rendez-vous"
- Documents à apporter: Carte vitale, carte mutuelle, ordonnances en cours
- Messagerie: Pour questions médicales, utiliser la section "Messages"

STYLE:
- Réponds en français
- Sois concis mais chaleureux
- Utilise des emojis avec modération (1-2 max par message)
- Propose toujours une action concrète

Si on te demande quelque chose hors de ton périmètre, réponds poliment que tu ne peux pas aider sur ce sujet et propose une alternative.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Token manquant" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the JWT token - this validates the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé - Session invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ============ END AUTHENTICATION CHECK ============

    const { messages, customPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = customPrompt && customPrompt.trim() 
      ? customPrompt 
      : DEFAULT_SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Service temporairement surchargé. Veuillez réessayer dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporairement indisponible." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service d'assistance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Patient chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
