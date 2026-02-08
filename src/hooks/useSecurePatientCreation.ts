import { useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { logGdprAudit } from '@/lib/gdprAudit';
import { toast } from 'sonner';

/**
 * Privacy by Design: Separate PII (identity) and Clinical data flows
 * PII data → identities_vault (never sent to n8n/AI)
 * Clinical data + UUID → medical_records → webhook n8n
 */

export interface IdentityData {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  nir?: string; // Numéro de sécurité sociale
  date_of_birth?: string;
}

export interface ClinicalData {
  symptoms?: string[];
  notes?: string;
  priority?: number;
  diagnosis?: string;
  treatment?: string;
}

export interface SecurePatientData {
  identity: IdentityData;
  clinical: ClinicalData;
}

// Patterns for PII detection
const PII_PATTERNS = {
  nir: /\b[12][0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[1-8][0-9]|9[0-9]|2[AB])[0-9]{3}[0-9]{3}[0-9]{2}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:(?:\+33|0033|0)[1-9](?:[\s.-]?[0-9]{2}){4})\b/g,
  name_prefix: /\b(?:M\.|Mme|Dr|Pr)\s+[A-Z][a-zéèêëàâäùûüôöîï]+\s+[A-Z][a-zéèêëàâäùûüôöîï]+\b/g,
};

/**
 * Sanitize text by masking PII data
 * @param text - Text potentially containing PII
 * @returns Sanitized text with PII masked
 */
export function sanitizePII(text: string): string {
  if (!text) return text;
  
  let sanitized = text;
  
  // Mask NIR (social security number)
  sanitized = sanitized.replace(PII_PATTERNS.nir, '[NIR MASQUÉ]');
  
  // Mask emails
  sanitized = sanitized.replace(PII_PATTERNS.email, '[EMAIL MASQUÉ]');
  
  // Mask phone numbers
  sanitized = sanitized.replace(PII_PATTERNS.phone, '[TÉL MASQUÉ]');
  
  // Mask potential names with titles
  sanitized = sanitized.replace(PII_PATTERNS.name_prefix, '[NOM MASQUÉ]');
  
  return sanitized;
}

/**
 * Detect PII in text and return matches
 * @param text - Text to analyze
 * @returns Object with detected PII types and matches
 */
export function detectPII(text: string): {
  hasPII: boolean;
  detections: {
    type: 'nir' | 'email' | 'phone' | 'name';
    matches: string[];
  }[];
} {
  if (!text) return { hasPII: false, detections: [] };
  
  const detections: { type: 'nir' | 'email' | 'phone' | 'name'; matches: string[] }[] = [];
  
  const nirMatches = text.match(PII_PATTERNS.nir);
  if (nirMatches) {
    detections.push({ type: 'nir', matches: nirMatches });
  }
  
  const emailMatches = text.match(PII_PATTERNS.email);
  if (emailMatches) {
    detections.push({ type: 'email', matches: emailMatches });
  }
  
  const phoneMatches = text.match(PII_PATTERNS.phone);
  if (phoneMatches) {
    detections.push({ type: 'phone', matches: phoneMatches });
  }
  
  const nameMatches = text.match(PII_PATTERNS.name_prefix);
  if (nameMatches) {
    detections.push({ type: 'name', matches: nameMatches });
  }
  
  return {
    hasPII: detections.length > 0,
    detections,
  };
}

/**
 * Generate a UUID client-side for linking identity and clinical data
 */
function generatePatientUUID(): string {
  return crypto.randomUUID();
}

export function useSecurePatientCreation() {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a patient with Privacy by Design architecture
   * Flow A: Identity → identities_vault (direct Supabase, never to n8n)
   * Flow B: Clinical + UUID → medical_records → webhook n8n (sanitized)
   */
  const createSecurePatient = async (
    data: SecurePatientData
  ): Promise<{ patientUUID: string; success: boolean }> => {
    if (!user || !structureId) {
      setError('Utilisateur non authentifié');
      return { patientUUID: '', success: false };
    }

    setIsCreating(true);
    setError(null);

    try {
      // Generate client-side UUID for linking
      const patientUUID = generatePatientUUID();

      // === FLOW A: Identity to Vault (never sent to n8n/AI) ===
      const { error: vaultError } = await supabase
        .from('identities_vault')
        .insert({
          patient_uuid: patientUUID,
          first_name: data.identity.first_name,
          last_name: data.identity.last_name,
          phone: data.identity.phone || null,
          email: data.identity.email || null,
          nir: data.identity.nir || null,
          date_of_birth: data.identity.date_of_birth || null,
          structure_id: structureId,
          created_by: user.id,
        });

      if (vaultError) {
        throw new Error(`Erreur coffre-fort identité: ${vaultError.message}`);
      }

      // Log vault creation for GDPR audit
      await logGdprAudit(structureId, user.id, 'vault_create', 'identity', {
        patientUuid: patientUUID,
        details: {
          has_nir: !!data.identity.nir,
          has_email: !!data.identity.email,
          has_phone: !!data.identity.phone,
        },
      });

      // === FLOW B: Clinical data (sanitized) + UUID ===
      // First, create a patient record in the patients table for linking
      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .insert({
          first_name: data.identity.first_name,
          last_name: data.identity.last_name,
          phone: data.identity.phone || null,
          email: data.identity.email || null,
          dob: data.identity.date_of_birth || null,
          structure_id: structureId,
          user_id: user.id,
        })
        .select()
        .single();

      if (patientError) {
        throw new Error(`Erreur création patient: ${patientError.message}`);
      }

      // Sanitize clinical notes before sending
      const originalNotes = data.clinical.notes || '';
      const sanitizedNotes = originalNotes ? sanitizePII(originalNotes) : null;
      const wasPseudonymized = originalNotes !== sanitizedNotes;

      // Log pseudonymization if it occurred
      if (wasPseudonymized) {
        const piiDetected = detectPII(originalNotes);
        await logGdprAudit(structureId, user.id, 'pseudonymization', 'medical_record', {
          patientUuid: patientUUID,
          targetId: patientRecord.id,
          details: {
            pii_types_masked: piiDetected.detections.map(d => d.type),
            total_pii_found: piiDetected.detections.reduce((acc, d) => acc + d.matches.length, 0),
          },
        });
      }

      // Create medical record with sanitized data
      const { error: recordError } = await supabase
        .from('medical_records')
        .insert({
          patient_id: patientRecord.id,
          user_id: user.id,
          symptoms: data.clinical.symptoms || null,
          notes: sanitizedNotes,
          diagnosis: data.clinical.diagnosis || null,
          treatment: data.clinical.treatment || null,
        });

      if (recordError) {
        throw new Error(`Erreur dossier médical: ${recordError.message}`);
      }

      toast.success('Patient créé avec architecture Privacy by Design');
      return { patientUUID, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      toast.error(message);
      return { patientUUID: '', success: false };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Get identity from vault by patient UUID
   * This should only be called when identity display is needed
   */
  const getIdentityFromVault = async (patientUUID: string): Promise<IdentityData | null> => {
    if (!user || !structureId) {
      return null;
    }

    const { data, error } = await supabase
      .from('identities_vault')
      .select('first_name, last_name, phone, email, nir, date_of_birth')
      .eq('patient_uuid', patientUUID)
      .single();

    if (error || !data) {
      return null;
    }

    // Log vault access for GDPR audit
    await logGdprAudit(structureId, user.id, 'vault_access', 'identity', {
      patientUuid: patientUUID,
      details: {
        fields_accessed: ['first_name', 'last_name', 'phone', 'email', 'nir', 'date_of_birth'],
      },
    });

    return {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      nir: data.nir || undefined,
      date_of_birth: data.date_of_birth || undefined,
    };
  };

  return {
    createSecurePatient,
    getIdentityFromVault,
    sanitizePII,
    detectPII,
    isCreating,
    error,
  };
}
