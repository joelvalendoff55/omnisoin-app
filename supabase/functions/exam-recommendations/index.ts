import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExamInfo {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  indications: string[] | null;
}

interface Antecedent {
  type: string;
  description: string;
  actif: boolean;
}

interface RequestBody {
  motif: string;
  symptoms: string[];
  antecedents: Antecedent[];
  clinicalNotes: string;
  availableExams: ExamInfo[];
}

interface ExamRecommendation {
  examId: string;
  relevance: 'high' | 'medium' | 'low';
  justification: string;
  matchedIndications: string[];
}

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

    // Verify user has medical role (for prescription recommendations)
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const allowedRoles = ["owner", "admin", "doctor", "ipa"];
    if (!orgMember || !allowedRoles.includes(orgMember.org_role)) {
      return new Response(
        JSON.stringify({ error: "Accès refusé - Rôle prescripteur requis" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ============ END AUTHENTICATION CHECK ============

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { motif, symptoms, antecedents, clinicalNotes, availableExams } = body;

    if (!motif || !availableExams || availableExams.length === 0) {
      return new Response(
        JSON.stringify({ error: "Motif et examens disponibles requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for AI
    const antecedentsText = antecedents.length > 0
      ? `Antécédents:\n${antecedents.map(a => `- ${a.type}: ${a.description} ${a.actif ? '(actif)' : '(résolu)'}`).join('\n')}`
      : "Aucun antécédent connu";

    const symptomsText = symptoms.length > 0
      ? `Symptômes rapportés: ${symptoms.join(', ')}`
      : "";

    const examsListText = availableExams.map(e => 
      `- ${e.code}: ${e.name} (${e.category || 'Général'}) - Indications: ${e.indications?.join(', ') || 'Non spécifiées'}`
    ).join('\n');

    const prompt = `Tu es un assistant médical spécialisé dans l'aide à la prescription d'examens complémentaires.

Contexte clinique:
- Motif de consultation: ${motif}
${symptomsText}
${clinicalNotes ? `Notes cliniques: ${clinicalNotes}` : ''}
${antecedentsText}

Examens disponibles dans la structure:
${examsListText}

Analyse le contexte clinique et recommande les examens complémentaires les plus pertinents parmi ceux disponibles.

Pour chaque examen recommandé, fournis:
1. L'ID de l'examen (examId)
2. Le niveau de pertinence: "high" (fortement recommandé), "medium" (recommandé), ou "low" (à considérer)
3. Une justification clinique courte et précise en français (max 2 phrases)
4. Les indications correspondantes qui ont motivé la recommandation

IMPORTANT:
- Ne recommande que des examens vraiment pertinents pour le contexte clinique
- Priorise les examens urgents ou importants en "high"
- Si aucun examen n'est pertinent, retourne une liste vide
- Sois pragmatique et évite la sur-prescription

Retourne UNIQUEMENT un JSON valide avec la structure suivante:
{
  "recommendations": [
    {
      "examId": "uuid",
      "relevance": "high|medium|low",
      "justification": "Explication clinique",
      "matchedIndications": ["indication1", "indication2"]
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "Tu es un assistant médical expert qui aide à prescrire des examens complémentaires. Tu réponds uniquement en JSON valide, sans markdown ni explication." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Contactez l'administrateur." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse AI response
    let recommendations: ExamRecommendation[] = [];
    try {
      // Clean response (remove markdown code blocks if present)
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      
      const parsed = JSON.parse(cleanContent);
      recommendations = parsed.recommendations || [];
      
      // Validate recommendations
      recommendations = recommendations.filter((rec: ExamRecommendation) => {
        return rec.examId && 
               ['high', 'medium', 'low'].includes(rec.relevance) &&
               rec.justification &&
               availableExams.some(e => e.id === rec.examId);
      });
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Return empty recommendations rather than error
      recommendations = [];
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Exam recommendations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
