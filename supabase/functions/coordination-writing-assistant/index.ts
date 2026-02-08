import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un assistant spécialisé en rédaction médicale et administrative pour les Maisons de Santé Pluriprofessionnelles (MSP).

Tu aides les coordinateurs à rédiger des documents professionnels de haute qualité :
- Lettres d'adressage vers spécialistes
- Protocoles de soins et de prise en charge
- Rapports d'activité (mensuels, annuels)
- Comptes-rendus de RCP (Réunion de Concertation Pluridisciplinaire)
- Conventions de partenariat
- Notes internes et communications

Règles importantes :
1. Génère des documents structurés, clairs et conformes aux normes médicales françaises
2. Utilise un langage professionnel et précis
3. Inclus les sections standards attendues pour chaque type de document
4. Respecte les règles de confidentialité (anonymise les données patients si nécessaire)
5. Propose des formulations adaptées au contexte médico-administratif français
6. Utilise le vouvoiement et un ton formel

Format de réponse :
- Structure tes documents avec des titres clairs
- Utilise des listes à puces quand approprié
- Indique les champs à personnaliser entre [crochets]
- Termine par une note sur les éléments à vérifier ou compléter`;

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

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé - Session invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has appropriate role (coordinator, admin, or higher)
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const allowedRoles = ["owner", "admin", "coordinator"];
    if (!orgMember || !allowedRoles.includes(orgMember.org_role)) {
      return new Response(
        JSON.stringify({ error: "Accès refusé - Rôle insuffisant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ============ END AUTHENTICATION CHECK ============

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coordination-writing-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
