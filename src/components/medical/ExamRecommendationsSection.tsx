"use client";

import { useState, useEffect, useCallback } from 'react';
import { useExamRecommendations } from '@/hooks/useExamRecommendations';
import { ExamRecommendationCard } from './ExamRecommendationCard';
import { ExamRecommendation, createExamPrescription } from '@/lib/exams';
import { useAntecedents } from '@/hooks/useAntecedents';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

interface ExamRecommendationsSectionProps {
  patientId?: string;
  consultationId?: string;
  motif?: string;
  symptoms?: string[];
  clinicalNotes?: string;
}

export function ExamRecommendationsSection({
  patientId,
  consultationId,
  motif = '',
  symptoms = [],
  clinicalNotes = '',
}: ExamRecommendationsSectionProps) {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const { antecedents } = useAntecedents(patientId);
  const {
    getRecommendations,
    isLoading,
    recommendations,
    reset,
  } = useExamRecommendations({ patientId });

  const [hasRequestedRecommendations, setHasRequestedRecommendations] = useState(false);

  const hasContext = motif.trim().length > 5 || symptoms.length > 0;

  // Auto-fetch recommendations when context changes
  useEffect(() => {
    if (hasContext && !hasRequestedRecommendations && patientId) {
      const fetchRecommendations = async () => {
        setHasRequestedRecommendations(true);
        await getRecommendations({
          motif,
          symptoms,
          antecedents: antecedents || [],
          clinicalNotes,
        });
      };
      
      // Debounce to avoid too many requests
      const timeout = setTimeout(fetchRecommendations, 1500);
      return () => clearTimeout(timeout);
    }
  }, [motif, symptoms.join(','), hasContext, patientId, hasRequestedRecommendations]);

  // Reset when patient changes
  useEffect(() => {
    reset();
    setHasRequestedRecommendations(false);
  }, [patientId, reset]);

  const handleRefresh = useCallback(async () => {
    if (!hasContext) return;
    
    await getRecommendations({
      motif,
      symptoms,
      antecedents: antecedents || [],
      clinicalNotes,
    });
  }, [motif, symptoms, antecedents, clinicalNotes, getRecommendations, hasContext]);

  const handlePrescribe = useCallback(async (recommendation: ExamRecommendation) => {
    if (!user?.id || !structureId || !patientId) {
      toast.error('Informations manquantes pour la prescription');
      return;
    }

    try {
      await createExamPrescription(user.id, {
        patient_id: patientId,
        exam_id: recommendation.exam.id,
        structure_id: structureId,
        indication: recommendation.justification,
        consultation_id: consultationId,
        priority: recommendation.relevance === 'high' ? 'urgent' : 'normal',
      });

      toast.success(`${recommendation.exam.name} prescrit avec succès`);
    } catch (err) {
      console.error('Error prescribing exam:', err);
      toast.error('Erreur lors de la prescription');
      throw err;
    }
  }, [user?.id, structureId, patientId, consultationId]);

  return (
    <ExamRecommendationCard
      recommendations={recommendations}
      isLoading={isLoading}
      onPrescribe={handlePrescribe}
      onRefresh={handleRefresh}
      hasContext={hasContext}
    />
  );
}
