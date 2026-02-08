import { supabase } from '@/integrations/supabase/client';
import { createNotification } from './notifications';
import type { Antecedent } from './antecedents';

export interface DrugInteraction {
  severity: 'high' | 'medium' | 'low';
  description: string;
  medications: string[];
}

export interface InteractionAnalysisResult {
  interactions: DrugInteraction[];
  contraindications: string[];
  warnings: string[];
  hasCritical: boolean;
}

/**
 * Analyze drug interactions for a patient's treatments
 * Returns detected interactions, focusing on critical ones for notifications
 */
export async function analyzeInteractionsForPatient(
  patientId: string,
  structureId: string
): Promise<InteractionAnalysisResult | null> {
  try {
    // Fetch all active treatments for this patient
    const { data: treatments, error: treatmentsError } = await supabase
      .from('patient_antecedents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('structure_id', structureId)
      .eq('type', 'traitement_en_cours')
      .eq('actif', true);

    if (treatmentsError) throw treatmentsError;
    if (!treatments || treatments.length < 2) {
      // Need at least 2 medications to have interactions
      return { interactions: [], contraindications: [], warnings: [], hasCritical: false };
    }

    // Fetch allergies
    const { data: allergies, error: allergiesError } = await supabase
      .from('patient_antecedents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('structure_id', structureId)
      .eq('type', 'allergique')
      .eq('actif', true);

    if (allergiesError) throw allergiesError;

    // Prepare medication list for AI analysis
    const medicationsList = treatments
      .map(t => `- ${t.description}${t.notes ? ` (${t.notes})` : ''}`)
      .join('\n');

    const allergiesList = (allergies || [])
      .map(a => `- ${a.description}`)
      .join('\n');

    const prompt = `Tu es un assistant médical expert en pharmacologie. Analyse les traitements en cours et détecte les interactions médicamenteuses potentielles.

TRAITEMENTS EN COURS:
${medicationsList}

${allergiesList ? `ALLERGIES CONNUES:\n${allergiesList}` : ''}

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
- IMPORTANT: Concentre-toi sur les interactions CRITIQUES (high) qui présentent un risque réel`;

    const { data, error: invokeError } = await supabase.functions.invoke('multi-llm', {
      body: {
        prompt,
        patientContext: 'Analyse interactions médicamenteuses post-import OCR',
        mode: 'analysis',
      },
    });

    if (invokeError) throw invokeError;

    const responseText = data?.response || data?.result || '';

    // Parse JSON response
    let parsed: { interactions?: DrugInteraction[]; contraindications?: string[]; warnings?: string[] } = {
      interactions: [],
      contraindications: [],
      warnings: [],
    };

    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) ||
                        responseText.match(/```\s*([\s\S]*?)```/) ||
                        [null, responseText];
      const jsonStr = jsonMatch[1] || responseText;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.warn('Failed to parse interaction analysis JSON');
    }

    const interactions = parsed.interactions || [];
    const hasCritical = interactions.some(i => i.severity === 'high');

    return {
      interactions,
      contraindications: parsed.contraindications || [],
      warnings: parsed.warnings || [],
      hasCritical,
    };
  } catch (err) {
    console.error('Error analyzing drug interactions:', err);
    return null;
  }
}

/**
 * Notify relevant users about critical drug interactions
 */
export async function notifyCriticalInteractions(
  patientId: string,
  structureId: string,
  patientName: string,
  interactions: DrugInteraction[],
  importingUserId: string
): Promise<void> {
  const criticalInteractions = interactions.filter(i => i.severity === 'high');
  
  if (criticalInteractions.length === 0) return;

  // Build notification message
  const interactionsList = criticalInteractions
    .map(i => `• ${i.medications.join(' + ')}: ${i.description}`)
    .join('\n');

  const title = `⚠️ Interactions critiques détectées - ${patientName}`;
  const message = `${criticalInteractions.length} interaction(s) médicamenteuse(s) majeure(s) détectée(s) après import OCR:\n${interactionsList.substring(0, 200)}${interactionsList.length > 200 ? '...' : ''}`;

  try {
    // Get all practitioners in the structure who should be notified
    // (medecin and coordinateur roles typically need to know about critical interactions)
    const { data: structureMembers, error: membersError } = await supabase
      .from('org_members')
      .select('user_id, org_role')
      .eq('structure_id', structureId)
      .eq('is_active', true)
      .in('org_role', ['doctor', 'coordinator', 'admin', 'ipa', 'owner']);

    if (membersError) throw membersError;

    // Create notifications for each relevant user
    const notificationPromises = (structureMembers || []).map(member =>
      createNotification(
        member.user_id,
        structureId,
        title,
        message,
        'warning',
        `/patients/${patientId}`
      )
    );

    await Promise.allSettled(notificationPromises);

    console.log(`Sent ${notificationPromises.length} critical interaction notifications`);
  } catch (err) {
    console.error('Error sending critical interaction notifications:', err);
  }
}

/**
 * Full workflow: analyze and notify about drug interactions after OCR import
 */
export async function checkAndNotifyInteractionsAfterImport(
  patientId: string,
  structureId: string,
  patientName: string,
  importingUserId: string,
  importedMedicationsCount: number
): Promise<InteractionAnalysisResult | null> {
  // Only analyze if medications were imported
  if (importedMedicationsCount === 0) return null;

  const result = await analyzeInteractionsForPatient(patientId, structureId);

  if (result && result.hasCritical) {
    await notifyCriticalInteractions(
      patientId,
      structureId,
      patientName,
      result.interactions,
      importingUserId
    );
  }

  return result;
}
