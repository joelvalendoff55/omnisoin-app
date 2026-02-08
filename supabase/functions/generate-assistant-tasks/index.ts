import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateTasksRequest {
  anamnesis: string;
  patientId?: string;
  transcriptId?: string;
}

interface GeneratedTask {
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'rdv' | 'courrier' | 'ordonnance' | 'administratif' | 'patient';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { anamnesis, patientId, transcriptId } = await req.json() as GenerateTasksRequest;

    if (!anamnesis || !anamnesis.trim()) {
      return new Response(
        JSON.stringify({ error: 'Anamnesis is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch system prompt from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = `Tu es un assistant spécialisé dans l'organisation du travail d'une assistante médicale.
À partir de l'anamnèse fournie, génère une liste de tâches administratives et organisationnelles.
Retourne UNIQUEMENT un tableau JSON de tâches avec: title, priority (high/medium/low), category (rdv/courrier/ordonnance/administratif/patient).`;

    // Try to fetch custom prompt from database
    const { data: promptData } = await supabase
      .from('system_prompts')
      .select('id')
      .eq('slug', 'assistant_tasks')
      .eq('is_active', true)
      .maybeSingle();

    if (promptData) {
      const { data: versionData } = await supabase
        .from('prompt_versions')
        .select('content')
        .eq('prompt_id', promptData.id)
        .eq('is_published', true)
        .maybeSingle();

      if (versionData?.content) {
        systemPrompt = versionData.content;
      }
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Anamnèse à analyser:\n\n${anamnesis}` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_tasks',
              description: 'Génère une liste de tâches administratives pour l\'assistante médicale',
              parameters: {
                type: 'object',
                properties: {
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Titre court de la tâche (max 60 caractères)' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                        category: { type: 'string', enum: ['rdv', 'courrier', 'ordonnance', 'administratif', 'patient'] },
                      },
                      required: ['title', 'priority', 'category'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['tasks'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_tasks' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI gateway error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Extract tasks from tool call response
    let tasks: GeneratedTask[] = [];
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        tasks = args.tasks || [];
      } catch (e) {
        console.error('Error parsing tool call arguments:', e);
      }
    }

    // Fallback: try to parse from content if no tool call
    if (tasks.length === 0 && aiResponse.choices?.[0]?.message?.content) {
      const content = aiResponse.choices[0].message.content;
      try {
        // Try to extract JSON array from the content
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          tasks = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Error parsing content as JSON:', e);
      }
    }

    // Validate and sanitize tasks
    tasks = tasks
      .filter((t: any) => t.title && typeof t.title === 'string')
      .map((t: any) => ({
        title: t.title.substring(0, 100),
        priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        category: ['rdv', 'courrier', 'ordonnance', 'administratif', 'patient'].includes(t.category) 
          ? t.category 
          : 'administratif',
      }))
      .slice(0, 10); // Max 10 tasks

    return new Response(
      JSON.stringify({ tasks, patientId, transcriptId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-assistant-tasks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
