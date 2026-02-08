import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultiLLMRequest {
  prompt: string;
  patientContext: string;
  mode: 'research' | 'analysis' | 'diagnosis' | 'legal';
}

interface MultiLLMResponse {
  perplexityResponse: string | null;
  geminiResponse: string | null;
  sources: string[];
  error?: string;
}

async function callPerplexity(prompt: string, patientContext: string, mode: string, apiKey: string): Promise<{ response: string; sources: string[] }> {
  const systemPrompt = mode === 'research' 
    ? `Tu es un assistant de recherche médicale. Fournis des informations basées sur des sources fiables et récentes. 
       Cite toujours tes sources. Contexte patient: ${patientContext}`
    : mode === 'diagnosis'
    ? `Tu es un assistant d'aide au diagnostic différentiel. Fournis des hypothèses basées sur la littérature médicale.
       Cite toujours tes sources. Contexte patient: ${patientContext}`
    : mode === 'legal'
    ? `Tu es un assistant juridique spécialisé dans le droit de la santé français, les MSP (Maisons de Santé Pluriprofessionnelles), 
       les ACI (Accords Conventionnels Interprofessionnels), les réglementations CPAM et ARS.
       Fournis des informations précises basées sur les textes réglementaires en vigueur.
       Cite toujours tes sources légales (articles de loi, décrets, circulaires). Contexte: ${patientContext}`
    : `Tu es un assistant d'analyse clinique. Analyse les données fournies selon les guidelines médicales actuelles.
       Cite toujours tes sources. Contexte patient: ${patientContext}`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      return_citations: true,
      search_recency_filter: 'month',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const citations = data.citations || [];
  
  return {
    response: content,
    sources: citations.map((c: { url?: string; title?: string }) => c.url || c.title || '').filter(Boolean),
  };
}

async function callGemini(prompt: string, patientContext: string, mode: string, apiKey: string): Promise<string> {
  const systemInstruction = mode === 'research'
    ? `Tu es un assistant de recherche médicale expert. Analyse les informations de manière critique et scientifique.`
    : mode === 'diagnosis'
    ? `Tu es un assistant d'aide au diagnostic. Propose des hypothèses diagnostiques structurées avec leurs critères.
       IMPORTANT: Tu ne poses PAS de diagnostic définitif. Tu proposes des PISTES de réflexion.`
    : mode === 'legal'
    ? `Tu es un expert juridique en droit de la santé français spécialisé dans les MSP.
       Domaines d'expertise: ACI, conventions CPAM, réglementations ARS, responsabilité professionnelle, délégation de tâches.
       Structure tes réponses de manière claire avec les références légales applicables.
       IMPORTANT: Ces informations sont à titre indicatif et ne remplacent pas un conseil juridique professionnel.`
    : `Tu es un assistant d'analyse clinique. Fournis une analyse structurée selon le format SOAP si pertinent.
       IMPORTANT: Toute décision clinique appartient au praticien.`;

  const fullPrompt = `Contexte patient:\n${patientContext}\n\nQuestion/Demande:\n${prompt}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: fullPrompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get API keys from environment (using existing secret names)
    const perplexityApiKey = Deno.env.get('Perplexity_API_Key');
    const geminiApiKey = Deno.env.get('Gemine_API_Key');

    if (!perplexityApiKey || !geminiApiKey) {
      console.error('Missing API keys');
      return new Response(
        JSON.stringify({ error: 'Configuration error: Missing API keys' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: MultiLLMRequest = await req.json();
    const { prompt, patientContext, mode } = payload;

    if (!prompt || !patientContext || !mode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, patientContext, mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['research', 'analysis', 'diagnosis', 'legal'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be: research, analysis, diagnosis, or legal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing multi-llm request for user ${user.id}, mode: ${mode}`);

    // Call both APIs in parallel
    const [perplexityResult, geminiResult] = await Promise.allSettled([
      callPerplexity(prompt, patientContext, mode, perplexityApiKey),
      callGemini(prompt, patientContext, mode, geminiApiKey),
    ]);

    const response: MultiLLMResponse = {
      perplexityResponse: null,
      geminiResponse: null,
      sources: [],
    };

    // Process Perplexity result
    if (perplexityResult.status === 'fulfilled') {
      response.perplexityResponse = perplexityResult.value.response;
      response.sources = perplexityResult.value.sources;
    } else {
      console.error('Perplexity failed:', perplexityResult.reason);
    }

    // Process Gemini result
    if (geminiResult.status === 'fulfilled') {
      response.geminiResponse = geminiResult.value;
    } else {
      console.error('Gemini failed:', geminiResult.reason);
    }

    // Check if both failed
    if (!response.perplexityResponse && !response.geminiResponse) {
      return new Response(
        JSON.stringify({ 
          error: 'Both AI services failed',
          perplexityResponse: null,
          geminiResponse: null,
          sources: []
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Multi-LLM error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
