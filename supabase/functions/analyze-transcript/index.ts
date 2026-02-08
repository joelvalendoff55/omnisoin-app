import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un assistant médical spécialisé dans l'analyse de transcriptions de consultations médicales.
Tu dois extraire et structurer les informations médicales de manière précise et professionnelle.

IMPORTANT:
- Extrais uniquement les informations explicitement mentionnées dans la transcription
- Ne fais pas d'hypothèses ou d'interprétations non fondées
- Indique "Non mentionné" si une information n'est pas disponible
- Utilise un langage médical approprié mais compréhensible
- Le niveau de confiance doit refléter la clarté et la complétude des informations extraites

Tu dois retourner une réponse structurée au format JSON.`;

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's auth for verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé - Session invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has medical role
    const { data: orgMember } = await supabaseAuth
      .from("org_members")
      .select("org_role, structure_id")
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

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transcriptId, transcriptText, recorderType, patientId, structureId, consultationId } = await req.json();

    if (!transcriptId || !transcriptText) {
      return new Response(
        JSON.stringify({ error: "transcriptId et transcriptText sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify structure matches user's structure
    if (structureId && structureId !== orgMember.structure_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé - Structure non autorisée" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const startTime = Date.now();

    // Create or update anamnesis record to 'processing'
    const { data: existingAnamnesis } = await supabase
      .from("consultation_anamnesis")
      .select("id")
      .eq("transcript_id", transcriptId)
      .single();

    let anamnesisId: string;
    
    if (existingAnamnesis) {
      anamnesisId = existingAnamnesis.id;
      await supabase
        .from("consultation_anamnesis")
        .update({ status: "processing" })
        .eq("id", anamnesisId);
    } else {
      const { data: newAnamnesis, error: insertError } = await supabase
        .from("consultation_anamnesis")
        .insert({
          transcript_id: transcriptId,
          patient_id: patientId,
          structure_id: structureId || orgMember.structure_id,
          consultation_id: consultationId || null,
          status: "processing",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      anamnesisId = newAnamnesis.id;
    }

    // Build the appropriate prompt based on recorder type
    const isAssistant = recorderType === "assistant";
    const isDoctor = recorderType === "doctor" || recorderType === "manual";

    let userPrompt = `Analyse cette transcription de consultation médicale et extrais les informations structurées.

TRANSCRIPTION:
"""
${transcriptText}
"""

`;

    if (isAssistant) {
      userPrompt += `
Cette transcription provient de l'ASSISTANTE MÉDICALE (pré-consultation).

Génère un résumé structuré pour préparer la consultation du médecin avec les éléments suivants:
1. Motif de consultation (raison principale de la visite)
2. Symptômes principaux (liste des symptômes mentionnés)
3. Antécédents pertinents (antécédents médicaux mentionnés)
4. Informations administratives (traitements en cours, allergies connues)
5. Niveau d'urgence suggéré (faible/modéré/élevé/critique)

Retourne la réponse au format JSON suivant:
{
  "motif": "string",
  "symptomes_principaux": ["string"],
  "antecedents_pertinents": ["string"],
  "infos_admin": {
    "traitements_en_cours": ["string"],
    "allergies": ["string"],
    "autres": "string"
  },
  "niveau_urgence": "faible|modéré|élevé|critique",
  "justification_urgence": "string",
  "confidence_score": 0.0-1.0
}`;
    } else if (isDoctor) {
      userPrompt += `
Cette transcription provient du MÉDECIN (consultation clinique).

Génère une anamnèse structurée complète avec les éléments suivants:
1. Histoire de la maladie (HDM) - chronologie et évolution
2. Antécédents (médicaux, chirurgicaux, familiaux)
3. Symptômes détaillés avec chronologie
4. Facteurs aggravants et soulageants
5. Hypothèses diagnostiques suggérées (par ordre de probabilité)
6. Examens complémentaires à envisager

Retourne la réponse au format JSON suivant:
{
  "histoire_maladie": "string (description narrative)",
  "antecedents": {
    "medicaux": ["string"],
    "chirurgicaux": ["string"],
    "familiaux": ["string"],
    "allergies": ["string"]
  },
  "symptomes_details": [
    {
      "symptome": "string",
      "debut": "string",
      "evolution": "string",
      "intensite": "string"
    }
  ],
  "facteurs": {
    "aggravants": ["string"],
    "soulageants": ["string"]
  },
  "hypotheses_diagnostiques": [
    {
      "diagnostic": "string",
      "probabilite": "haute|moyenne|faible",
      "arguments": ["string"]
    }
  ],
  "examens_suggeres": [
    {
      "examen": "string",
      "justification": "string",
      "urgence": "immédiat|sous 24h|sous 1 semaine|programmé"
    }
  ],
  "confidence_score": 0.0-1.0
}`;
    } else {
      userPrompt += `
Génère un résumé général de cette consultation avec les points clés.

Retourne la réponse au format JSON suivant:
{
  "resume_general": "string",
  "points_cles": ["string"],
  "actions_suggerees": ["string"],
  "confidence_score": 0.0-1.0
}`;
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        await supabase
          .from("consultation_anamnesis")
          .update({ 
            status: "failed", 
            error_message: "Rate limit exceeded. Please try again later." 
          })
          .eq("id", anamnesisId);
        
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        await supabase
          .from("consultation_anamnesis")
          .update({ 
            status: "failed", 
            error_message: "Payment required. Please add credits." 
          })
          .eq("id", anamnesisId);
        
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsedContent;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedContent = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    const processingTime = Date.now() - startTime;
    const confidenceScore = parsedContent.confidence_score || 0.7;

    // Update anamnesis with results
    const updateData: Record<string, unknown> = {
      status: "completed",
      confidence_score: confidenceScore,
      model_used: "google/gemini-2.5-flash",
      processing_time_ms: processingTime,
      structured_data: parsedContent,
    };

    if (isAssistant) {
      updateData.assistant_summary = parsedContent;
    } else if (isDoctor) {
      updateData.doctor_summary = parsedContent;
    }

    const { error: updateError } = await supabase
      .from("consultation_anamnesis")
      .update(updateData)
      .eq("id", anamnesisId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        anamnesisId,
        confidenceScore,
        processingTimeMs: processingTime,
        summary: parsedContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-transcript:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
