"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useToast } from '@/hooks/use-toast';
import {
  PatientConsent,
  ConsentTemplate,
  PatientConsentType,
  fetchPatientConsents,
  fetchConsentTemplates,
  createConsent,
  refuseConsent,
  revokeConsent,
  CreateConsentParams,
} from '@/lib/patientConsents';

export interface UsePatientConsentsResult {
  consents: PatientConsent[];
  templates: ConsentTemplate[];
  loading: boolean;
  error: Error | null;
  obtainConsent: (params: Omit<CreateConsentParams, 'structure_id' | 'obtained_by'>) => Promise<PatientConsent>;
  refuse: (templateId: string, consentType: PatientConsentType, reason: string) => Promise<void>;
  revoke: (consentId: string, reason: string) => Promise<void>;
  refresh: () => Promise<void>;
  getConsentForType: (consentType: PatientConsentType) => PatientConsent | null;
  getMissingRequiredConsents: () => ConsentTemplate[];
}

export function usePatientConsents(patientId: string | undefined): UsePatientConsentsResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const { user } = useAuth();
  const { toast } = useToast();
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!structureId || !patientId) return;

    try {
      setLoading(true);
      const [consentsData, templatesData] = await Promise.all([
        fetchPatientConsents(patientId),
        fetchConsentTemplates(structureId),
      ]);
      setConsents(consentsData);
      setTemplates(templatesData);
      setError(null);
    } catch (err) {
      console.error('Error loading consents:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId, patientId]);

  // Initial load and realtime subscription
  useEffect(() => {
    if (!structureId || !patientId) return;

    loadData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`patient-consents-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_consents',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, patientId, loadData]);

  const obtainConsent = useCallback(
    async (params: Omit<CreateConsentParams, 'structure_id' | 'obtained_by'>): Promise<PatientConsent> => {
      if (!structureId || !user) {
        throw new Error('Structure ou utilisateur non disponible');
      }

      try {
        const result = await createConsent({
          ...params,
          structure_id: structureId,
          obtained_by: user.id,
        });

        toast({
          title: 'Consentement enregistré',
          description: 'Le consentement a été obtenu et enregistré avec succès.',
        });

        return result;
      } catch (err) {
        console.error('Error obtaining consent:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'enregistrer le consentement.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [structureId, user, toast]
  );

  const refuseHandler = useCallback(
    async (templateId: string, consentType: PatientConsentType, reason: string): Promise<void> => {
      if (!structureId || !patientId) {
        throw new Error('Structure ou patient non disponible');
      }

      try {
        await refuseConsent(structureId, patientId, templateId, consentType, reason);
        toast({
          title: 'Refus enregistré',
          description: 'Le refus de consentement a été enregistré.',
        });
      } catch (err) {
        console.error('Error refusing consent:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'enregistrer le refus.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [structureId, patientId, toast]
  );

  const revokeHandler = useCallback(
    async (consentId: string, reason: string): Promise<void> => {
      if (!user) {
        throw new Error('Utilisateur non disponible');
      }

      try {
        await revokeConsent(consentId, reason, user.id);
        toast({
          title: 'Révocation enregistrée',
          description: 'Le consentement a été révoqué.',
        });
      } catch (err) {
        console.error('Error revoking consent:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de révoquer le consentement.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [user, toast]
  );

  const getConsentForType = useCallback(
    (consentType: PatientConsentType): PatientConsent | null => {
      const filtered = consents
        .filter((c) => c.consent_type === consentType && c.status === 'obtained')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return filtered[0] || null;
    },
    [consents]
  );

  const getMissingRequiredConsents = useCallback((): ConsentTemplate[] => {
    const requiredTemplates = templates.filter((t) => t.required_for_care);
    return requiredTemplates.filter((template) => {
      const hasValidConsent = consents.some(
        (c) => c.consent_type === template.consent_type && c.status === 'obtained'
      );
      return !hasValidConsent;
    });
  }, [templates, consents]);

  return {
    consents,
    templates,
    loading: loading || structureLoading,
    error,
    obtainConsent,
    refuse: refuseHandler,
    revoke: revokeHandler,
    refresh: loadData,
    getConsentForType,
    getMissingRequiredConsents,
  };
}
