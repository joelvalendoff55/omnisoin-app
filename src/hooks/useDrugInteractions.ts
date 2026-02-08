import { useState, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Antecedent } from '@/lib/antecedents';

export interface DrugInteraction {
  severity: 'high' | 'medium' | 'low';
  description: string;
  medications: string[];
}

export interface DrugInteractionResult {
  interactions: DrugInteraction[];
  contraindications: string[];
  warnings: string[];
  analyzedAt: Date;
}

export function useDrugInteractions() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DrugInteractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeTreatments = useCallback(async (
    treatments: Antecedent[],
    allergies: Antecedent[],
    patientContext?: string
  ): Promise<DrugInteractionResult | null> => {
    if (treatments.length === 0) {
      setResult(null);
      return null;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const medicationsList = treatments
        .filter(t => t.actif)
        .map(t => `- ${t.description}${t.notes ? ` (${t.notes})` : ''}`)
        .join('\n');

      const allergiesList = allergies
        .filter(a => a.actif)
        .map(a => `- ${a.description}`)
        .join('\n');

      const prompt = `Tu es un assistant médical expert en pharmacologie. Analyse les traitements en cours et détecte les interactions médicamenteuses potentielles.

TRAITEMENTS EN COURS:
${medicationsList}

${allergiesList ? `ALLERGIES CONNUES:\n${allergiesList}` : ''}

${patientContext ? `CONTEXTE PATIENT:\n${patientContext}` : ''}

Réponds UNIQUEMENT au format JSON suivant, sans aucun texte avant ou après:
{
  "interactions": [
    {
      "severity": "high" | "medium" | "low",
      "description": "Description de l'interaction",
      "medications": ["médicament1", "médicament2"]
    }
  ],
  "contraindications": ["contre-indication liée aux allergies"],
  "warnings": ["point de vigilance général"]
}

Règles:
- severity "high": interaction majeure nécessitant une réévaluation du traitement
- severity "medium": interaction modérée à surveiller
- severity "low": interaction mineure, précaution d'emploi
- Si aucune interaction détectée, retourne des tableaux vides
- Sois factuel et base-toi sur les données pharmacologiques connues
- IMPORTANT: Ceci est une aide à la décision, non une prescription`;

      const { data, error: invokeError } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt,
          patientContext: 'Analyse interactions médicamenteuses',
          mode: 'analysis',
        },
      });

      if (invokeError) throw invokeError;

      const responseText = data?.response || data?.result || '';
      
      // Try to parse JSON from response
      let parsed: { interactions?: DrugInteraction[]; contraindications?: string[]; warnings?: string[] } = {
        interactions: [],
        contraindications: [],
        warnings: [],
      };

      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) || 
                          responseText.match(/```\s*([\s\S]*?)```/) ||
                          [null, responseText];
        const jsonStr = jsonMatch[1] || responseText;
        parsed = JSON.parse(jsonStr.trim());
      } catch {
        // If parsing fails, try to extract structured data from text
        console.warn('Failed to parse JSON response, using empty result');
      }

      const analysisResult: DrugInteractionResult = {
        interactions: parsed.interactions || [],
        contraindications: parsed.contraindications || [],
        warnings: parsed.warnings || [],
        analyzedAt: new Date(),
      };

      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse';
      setError(message);
      console.error('Drug interaction analysis error:', err);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyzing,
    result,
    error,
    analyzeTreatments,
    clearResult,
  };
}
