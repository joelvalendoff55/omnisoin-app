import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClinicalSuggestionsRequest {
  patientContext: string;
  transcriptText?: string;
  symptoms?: string[];
  additionalNotes?: string;
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has medical role (admin, owner, doctor, ipa, nurse, practitioner)
    const { data: orgMember } = await supabase
      .from('org_members')
      .select('org_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const medicalRoles = ['owner', 'admin', 'doctor', 'ipa', 'nurse', 'practitioner'];
    if (!orgMember || !medicalRoles.includes(orgMember.org_role)) {
      console.warn('Access denied for user:', user.id, 'role:', orgMember?.org_role);
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Rôle médical requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the payload
    const payload: ClinicalSuggestionsRequest = await req.json();
    console.log('Received clinical suggestions request for user:', user.id, 'role:', orgMember.org_role);

    // Get the LOVABLE_API_KEY
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch the clinical_suggestions prompt from database
    const { data: promptData, error: promptError } = await supabase
      .from('system_prompts')
      .select(`
        id,
        is_active,
        prompt_versions!inner(content, is_published)
      `)
      .eq('slug', 'clinical_suggestions')
      .eq('is_active', true)
      .eq('prompt_versions.is_published', true)
      .maybeSingle();

    let systemPrompt = `Tu es un assistant d'aide à la réflexion clinique. Tu ne poses JAMAIS de diagnostic et tu ne prescris JAMAIS de traitement.

RÈGLES ABSOLUES:
- Tu n'es PAS médecin et tu ne remplaces PAS le jugement médical
- Tu proposes des PISTES DE RÉFLEXION, pas des recommandations
- Tu utilises TOUJOURS un langage conditionnel: "pourrait être envisagé", "à considérer", "selon le contexte clinique"
- Tu ne mentionnes JAMAIS de molécules ou médicaments spécifiques, uniquement des CLASSES THÉRAPEUTIQUES
- Tu rappelles que toute décision appartient au praticien

FORMAT DE RÉPONSE:

## Examens biologiques à considérer
(Liste d'examens qui pourraient être pertinents selon le contexte, avec justification)

## Classes thérapeutiques à envisager
(Uniquement des classes génériques: antalgiques, anti-inflammatoires, etc. JAMAIS de molécules)

## Diagnostics différentiels à explorer
(Pistes de réflexion diagnostique à adapter au contexte clinique local)

## Points de vigilance
(Éléments de surveillance ou précautions générales)

IMPORTANT: Termine toujours par rappeler que ces suggestions doivent être adaptées au contexte clinique local et que le praticien reste seul responsable de ses décisions.`;

    if (promptData && Array.isArray(promptData.prompt_versions) && promptData.prompt_versions[0]?.content) {
      systemPrompt = promptData.prompt_versions[0].content;
    }

    // Build the user message
    let userMessage = `Contexte patient:\n${payload.patientContext}`;
    
    if (payload.transcriptText) {
      userMessage += `\n\nTranscription de la consultation:\n${payload.transcriptText}`;
    }
    
    if (payload.symptoms && payload.symptoms.length > 0) {
      userMessage += `\n\nSymptômes rapportés:\n- ${payload.symptoms.join('\n- ')}`;
    }
    
    if (payload.additionalNotes) {
      userMessage += `\n\nNotes additionnelles:\n${payload.additionalNotes}`;
    }

    userMessage += `\n\nGénère des pistes de réflexion clinique en suivant le format demandé. Rappelle-toi d'utiliser uniquement un langage conditionnel.`;

    // Call Lovable AI Gateway
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
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, veuillez réessayer plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération des suggestions." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const suggestions = data.choices?.[0]?.message?.content || "Aucune suggestion générée.";

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions,
        disclaimer: "Ces pistes de réflexion sont générées par une IA et ne constituent en aucun cas un avis médical. Le praticien reste seul responsable de ses décisions cliniques."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Clinical suggestions error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
