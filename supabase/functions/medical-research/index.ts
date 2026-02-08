import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MedicalResearchRequest {
  query: string;
  mode: 'diagnostic' | 'reference';
  symptoms?: string[];
  clinicalSigns?: string[];
  context?: string;
}

interface Source {
  title: string;
  url: string;
  type: 'has' | 'vidal' | 'pubmed' | 'ansm' | 'other';
}

interface MedicalResearchResponse {
  content: string;
  sources: Source[];
  confidenceLevel: 'high' | 'medium' | 'low' | 'none';
  confidenceReason: string;
  hasOfficialSources: boolean;
}

// Official medical source patterns
const OFFICIAL_SOURCE_PATTERNS = {
  has: /has-sante\.fr|haute-autorite-de-sante/i,
  vidal: /vidal\.fr/i,
  pubmed: /pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov/i,
  ansm: /ansm\.sante\.fr/i,
};

function categorizeSource(url: string): Source['type'] {
  if (OFFICIAL_SOURCE_PATTERNS.has.test(url)) return 'has';
  if (OFFICIAL_SOURCE_PATTERNS.vidal.test(url)) return 'vidal';
  if (OFFICIAL_SOURCE_PATTERNS.pubmed.test(url)) return 'pubmed';
  if (OFFICIAL_SOURCE_PATTERNS.ansm.test(url)) return 'ansm';
  return 'other';
}

function calculateConfidence(sources: Source[]): { level: 'high' | 'medium' | 'low' | 'none'; reason: string } {
  const officialSources = sources.filter(s => s.type !== 'other');
  const hasCount = sources.filter(s => s.type === 'has').length;
  const pubmedCount = sources.filter(s => s.type === 'pubmed').length;
  
  if (sources.length === 0) {
    return { level: 'none', reason: 'Aucune source trouvée' };
  }
  
  if (hasCount >= 2 || (hasCount >= 1 && pubmedCount >= 2)) {
    return { level: 'high', reason: `Basé sur ${hasCount} source(s) HAS et ${pubmedCount} publication(s) PubMed` };
  }
  
  if (officialSources.length >= 2) {
    return { level: 'high', reason: `Basé sur ${officialSources.length} sources officielles (HAS, Vidal, ANSM, PubMed)` };
  }
  
  if (officialSources.length === 1) {
    return { level: 'medium', reason: `Basé sur 1 source officielle (${officialSources[0].type.toUpperCase()})` };
  }
  
  if (sources.length >= 3) {
    return { level: 'low', reason: 'Sources non-officielles uniquement' };
  }
  
  return { level: 'low', reason: 'Peu de sources disponibles' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

    // Verify user has medical role (for sensitive medical research)
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const allowedRoles = ["owner", "admin", "coordinator", "doctor", "ipa", "nurse"];
    if (!orgMember || !allowedRoles.includes(orgMember.org_role)) {
      return new Response(
        JSON.stringify({ error: "Accès refusé - Rôle médical requis" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ============ END AUTHENTICATION CHECK ============

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const payload: MedicalResearchRequest = await req.json();
    const { query, mode, symptoms, clinicalSigns, context } = payload;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context-aware prompt
    let fullPrompt = '';
    
    if (mode === 'diagnostic') {
      const symptomsText = symptoms?.length ? `Symptômes: ${symptoms.join(', ')}` : '';
      const signsText = clinicalSigns?.length ? `Signes cliniques: ${clinicalSigns.join(', ')}` : '';
      const contextText = context ? `Contexte additionnel: ${context}` : '';
      
      fullPrompt = `Tu es un assistant médical spécialisé dans l'aide au diagnostic différentiel.

RÈGLES STRICTES:
1. Tu NE poses JAMAIS de diagnostic définitif
2. Tu proposes des HYPOTHÈSES à vérifier par le praticien
3. Tu cites UNIQUEMENT des sources officielles: HAS (has-sante.fr), Vidal, ANSM, PubMed
4. Si tu n'as pas de source officielle fiable, tu DOIS répondre: "Je ne dispose pas d'informations fiables basées sur des sources officielles pour cette question."
5. Utilise un langage conditionnel: "pourrait être considéré", "à envisager", "suggère"

${symptomsText}
${signsText}
${contextText}

Question: ${query}

Fournis:
1. Hypothèses diagnostiques principales (max 3)
2. Diagnostics différentiels à éliminer
3. Examens complémentaires recommandés selon les guidelines HAS
4. Points de vigilance

Pour chaque recommandation, cite la source officielle correspondante.`;
    } else {
      fullPrompt = `Tu es un assistant de recherche médicale.

RÈGLES STRICTES:
1. Base tes réponses UNIQUEMENT sur des sources officielles: HAS (has-sante.fr), Vidal, ANSM (ansm.sante.fr), PubMed
2. Cite systématiquement l'URL de chaque source
3. Si aucune source officielle n'est disponible, réponds: "Je ne dispose pas d'informations fiables basées sur des sources officielles pour cette question."
4. Privilégie les recommandations HAS françaises

Question: ${query}

Fournis une réponse structurée avec les sources citées.`;
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants. Contactez l\'administrateur.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract URLs from the response
    const urlRegex = /https?:\/\/[^\s\)>\]]+/gi;
    const extractedUrls = content.match(urlRegex) || [];
    
    // Categorize and dedupe sources
    const sourcesMap = new Map<string, Source>();
    for (const url of extractedUrls) {
      const cleanUrl = url.replace(/[.,;:!?]$/, '');
      if (!sourcesMap.has(cleanUrl)) {
        const type = categorizeSource(cleanUrl);
        sourcesMap.set(cleanUrl, {
          title: type === 'has' ? 'Haute Autorité de Santé' :
                 type === 'vidal' ? 'Vidal' :
                 type === 'pubmed' ? 'PubMed' :
                 type === 'ansm' ? 'ANSM' : 'Source',
          url: cleanUrl,
          type
        });
      }
    }

    const sources = Array.from(sourcesMap.values());
    const { level: confidenceLevel, reason: confidenceReason } = calculateConfidence(sources);
    const hasOfficialSources = sources.some(s => s.type !== 'other');

    // Check if AI indicated no reliable sources
    const noReliableSourcesPattern = /ne dispose pas d'informations fiables|pas de source officielle|aucune source officielle/i;
    const indicatedNoSources = noReliableSourcesPattern.test(content);

    const result: MedicalResearchResponse = {
      content: indicatedNoSources && sources.length === 0 
        ? "Je ne dispose pas d'informations fiables basées sur des sources officielles pour cette question. Veuillez consulter directement les bases de données HAS, Vidal ou PubMed."
        : content,
      sources,
      confidenceLevel: indicatedNoSources ? 'none' : confidenceLevel,
      confidenceReason: indicatedNoSources ? 'Aucune source officielle disponible' : confidenceReason,
      hasOfficialSources: !indicatedNoSources && hasOfficialSources,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Medical research error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
