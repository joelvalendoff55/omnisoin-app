import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  documentId: string;
  fileUrl: string;
  mimeType?: string;
}

interface ExtractedMedicalData {
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;
  dates: Array<{
    value: string;
    context?: string;
  }>;
  labResults: Array<{
    name: string;
    value: string;
    unit?: string;
    reference?: string;
    status?: 'normal' | 'high' | 'low' | 'critical';
  }>;
  diagnoses: string[];
  procedures: string[];
  patientInfo: {
    name?: string;
    birthDate?: string;
    socialSecurityNumber?: string;
  };
  documentType?: string;
  summary?: string;
}

interface OCRResponse {
  rawText: string;
  extractedData: ExtractedMedicalData;
  confidence: number;
}

const EXTRACTION_PROMPT = `Tu es un assistant spécialisé dans l'analyse de documents médicaux français.
Analyse le texte extrait du document et extrais les informations suivantes de manière structurée:

1. **Médicaments**: Nom, dosage, fréquence, durée
2. **Dates importantes**: Date de consultation, date de prescription, dates de rendez-vous
3. **Résultats biologiques**: Nom du test, valeur, unité, valeurs de référence, statut (normal/élevé/bas/critique)
4. **Diagnostics**: Liste des diagnostics mentionnés
5. **Procédures/Actes**: Examens effectués ou à effectuer
6. **Informations patient**: Nom, date de naissance, numéro de sécurité sociale (partiellement masqué)
7. **Type de document**: Ordonnance, compte-rendu, résultats de laboratoire, etc.
8. **Résumé**: Un résumé court (2-3 phrases) du contenu du document

IMPORTANT: 
- Extrais UNIQUEMENT les informations réellement présentes dans le texte
- Pour les résultats de laboratoire, indique le statut basé sur les valeurs de référence si disponibles
- Masque partiellement les données sensibles (SSN: afficher seulement les 5 derniers chiffres)
- Si une information n'est pas trouvée, laisse le champ vide ou null`;

async function callLovableAI(prompt: string, documentText: string): Promise<OCRResponse> {
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
        { role: "system", content: prompt },
        { role: "user", content: `Voici le texte extrait du document médical:\n\n${documentText}` }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_medical_data",
            description: "Extraire les données médicales structurées du document",
            parameters: {
              type: "object",
              properties: {
                medications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      dosage: { type: "string" },
                      frequency: { type: "string" },
                      duration: { type: "string" }
                    },
                    required: ["name"]
                  }
                },
                dates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      context: { type: "string" }
                    },
                    required: ["value"]
                  }
                },
                labResults: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      value: { type: "string" },
                      unit: { type: "string" },
                      reference: { type: "string" },
                      status: { type: "string", enum: ["normal", "high", "low", "critical"] }
                    },
                    required: ["name", "value"]
                  }
                },
                diagnoses: {
                  type: "array",
                  items: { type: "string" }
                },
                procedures: {
                  type: "array",
                  items: { type: "string" }
                },
                patientInfo: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    birthDate: { type: "string" },
                    socialSecurityNumber: { type: "string" }
                  }
                },
                documentType: { type: "string" },
                summary: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 }
              },
              required: ["medications", "dates", "labResults", "diagnoses", "procedures", "documentType"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_medical_data" } }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limits exceeded, please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required, please add funds to your Lovable AI workspace.");
    }
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    throw new Error(`AI processing error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract the tool call result
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== "extract_medical_data") {
    throw new Error("Invalid AI response format");
  }

  const extractedData = JSON.parse(toolCall.function.arguments) as ExtractedMedicalData & { confidence?: number };
  const confidence = extractedData.confidence || 0.85;
  delete (extractedData as any).confidence;

  return {
    rawText: documentText,
    extractedData,
    confidence
  };
}

// Simple text extraction from base64 image (placeholder for actual OCR)
// In production, this would use a proper OCR service or the AI's vision capabilities
async function extractTextFromDocument(fileUrl: string, mimeType?: string): Promise<string> {
  // For images, we'll use the AI's vision capabilities directly
  if (mimeType?.startsWith('image/')) {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch document image");
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Use Gemini's vision capabilities for OCR
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
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrais tout le texte visible de ce document médical. Retourne uniquement le texte brut extrait, sans commentaires ni formatage."
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision OCR error:", response.status, errorText);
      throw new Error(`OCR processing error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // For PDFs, we would need a PDF parsing library
  // For now, return a placeholder indicating the file type
  if (mimeType === 'application/pdf') {
    return "[Document PDF - Extraction de texte en cours de développement. Veuillez scanner le document en tant qu'image pour l'OCR.]";
  }

  return "[Format de fichier non supporté pour l'OCR]";
}

Deno.serve(async (req) => {
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

    // Parse request body
    const payload: OCRRequest = await req.json();
    const { documentId, fileUrl, mimeType } = payload;

    if (!documentId || !fileUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentId, fileUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing OCR for document ${documentId}, user ${user.id}`);

    // Step 1: Extract text from document (OCR)
    const rawText = await extractTextFromDocument(fileUrl, mimeType);

    if (!rawText || rawText.startsWith('[')) {
      // Return early with placeholder if extraction failed
      return new Response(
        JSON.stringify({
          rawText,
          extractedData: {
            medications: [],
            dates: [],
            labResults: [],
            diagnoses: [],
            procedures: [],
            patientInfo: {},
            documentType: 'unknown',
            summary: 'Extraction de texte non disponible pour ce type de fichier.'
          },
          confidence: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Analyze and extract structured data
    const ocrResult = await callLovableAI(EXTRACTION_PROMPT, rawText);

    console.log(`OCR completed for document ${documentId}, confidence: ${ocrResult.confidence}`);

    return new Response(
      JSON.stringify(ocrResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document OCR error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
