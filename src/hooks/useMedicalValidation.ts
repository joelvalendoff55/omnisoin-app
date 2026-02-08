"use client";

import { useState, useCallback, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';

export interface ValidationEntry {
  id: string;
  consultation_id: string;
  validator_user_id: string;
  validator_name: string;
  validator_role: string;
  validated_content: Record<string, unknown>;
  content_hash: string;
  validation_statement: string;
  signature_hash: string;
  structure_id: string;
  patient_id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  validated_at: string;
  version: number;
}

interface ValidateConsultationParams {
  consultationId: string;
  consultationContent: Record<string, unknown>;
  structureId: string;
  patientId: string;
  customStatement?: string;
}

interface UseMedicalValidationReturn {
  validateConsultation: (params: ValidateConsultationParams) => Promise<ValidationEntry | null>;
  getValidationHistory: (consultationId: string) => Promise<ValidationEntry[]>;
  getLatestValidation: (consultationId: string) => Promise<ValidationEntry | null>;
  isValidated: (consultationId: string) => Promise<boolean>;
  loading: boolean;
}

// Hash the consultation content
async function computeContentHash(content: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(content, Object.keys(content).sort()));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

export function useMedicalValidation(): UseMedicalValidationReturn {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user } = useAuth();
  const { isPractitioner, isAdmin, roles } = useRole();

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const primaryRole = roles[0] || 'unknown';

  const getValidatorName = useCallback((): string => {
    if (!profile) return 'Utilisateur inconnu';
    const prefix = isPractitioner ? 'Dr ' : '';
    return `${prefix}${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur';
  }, [profile, isPractitioner]);

  const validateConsultation = useCallback(async (params: ValidateConsultationParams): Promise<ValidationEntry | null> => {
    if (!user) {
      toast.error('Vous devez être connecté pour valider une consultation');
      return null;
    }

    if (!isPractitioner && !isAdmin) {
      toast.error('Seuls les médecins peuvent valider une consultation');
      return null;
    }

    setLoading(true);
    try {
      const contentHash = await computeContentHash(params.consultationContent);
      
      const { data, error } = await (supabase
        .from('consultation_validations' as any)
        .insert({
          consultation_id: params.consultationId,
          validator_user_id: user.id,
          validator_name: getValidatorName(),
          validator_role: primaryRole,
          validated_content: params.consultationContent,
          content_hash: contentHash,
          validation_statement: params.customStatement || 'Je valide le contenu médical de cette consultation',
          structure_id: params.structureId,
          patient_id: params.patientId,
          ip_address: null,
          user_agent: navigator.userAgent,
        })
        .select()
        .single()) as { data: ValidationEntry | null; error: any };

      if (error) {
        console.error('Error validating consultation:', error);
        toast.error('Erreur lors de la validation');
        return null;
      }

      toast.success('Consultation validée et signée');
      return data as ValidationEntry;
    } catch (error) {
      console.error('Error in validateConsultation:', error);
      toast.error('Erreur lors de la validation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, isPractitioner, isAdmin, primaryRole, getValidatorName]);

  const getValidationHistory = useCallback(async (consultationId: string): Promise<ValidationEntry[]> => {
    try {
      const { data, error } = await (supabase
        .from('consultation_validations' as any)
        .select('*')
        .eq('consultation_id', consultationId)
        .order('version', { ascending: false })) as { data: ValidationEntry[] | null; error: any };

      if (error) {
        console.error('Error fetching validation history:', error);
        return [];
      }

      return (data || []) as ValidationEntry[];
    } catch (error) {
      console.error('Error in getValidationHistory:', error);
      return [];
    }
  }, []);

  const getLatestValidation = useCallback(async (consultationId: string): Promise<ValidationEntry | null> => {
    try {
      const { data, error } = await (supabase
        .from('consultation_validations' as any)
        .select('*')
        .eq('consultation_id', consultationId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: ValidationEntry | null; error: any };

      if (error) {
        console.error('Error fetching latest validation:', error);
        return null;
      }

      return data as ValidationEntry | null;
    } catch (error) {
      console.error('Error in getLatestValidation:', error);
      return null;
    }
  }, []);

  const isValidated = useCallback(async (consultationId: string): Promise<boolean> => {
    const validation = await getLatestValidation(consultationId);
    return validation !== null;
  }, [getLatestValidation]);

  return {
    validateConsultation,
    getValidationHistory,
    getLatestValidation,
    isValidated,
    loading,
  };
}
