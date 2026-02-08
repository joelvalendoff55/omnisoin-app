"use client";

import { useState, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';
import { ComplementaryExam, ExamRecommendation, fetchComplementaryExams } from '@/lib/exams';
import { Antecedent } from '@/lib/antecedents';

interface UseExamRecommendationsOptions {
  patientId?: string;
}

interface ExamRecommendationRequest {
  motif: string;
  symptoms?: string[];
  antecedents?: Antecedent[];
  clinicalNotes?: string;
}

export function useExamRecommendations({ patientId }: UseExamRecommendationsOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<ExamRecommendation[]>([]);
  const [availableExams, setAvailableExams] = useState<ComplementaryExam[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAvailableExams = useCallback(async () => {
    try {
      const exams = await fetchComplementaryExams();
      setAvailableExams(exams);
      return exams;
    } catch (err) {
      console.error('Error loading exams:', err);
      return [];
    }
  }, []);

  const getRecommendations = useCallback(async (request: ExamRecommendationRequest) => {
    if (!request.motif.trim()) {
      toast.error('Veuillez saisir un motif de consultation');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load available exams if not already loaded
      let exams = availableExams;
      if (exams.length === 0) {
        exams = await loadAvailableExams();
      }

      // Call edge function for AI recommendations
      const { data, error: fnError } = await supabase.functions.invoke('exam-recommendations', {
        body: {
          motif: request.motif,
          symptoms: request.symptoms || [],
          antecedents: request.antecedents?.map(a => ({
            type: a.type,
            description: a.description,
            actif: a.actif,
          })) || [],
          clinicalNotes: request.clinicalNotes || '',
          availableExams: exams.map(e => ({
            id: e.id,
            code: e.code,
            name: e.name,
            description: e.description,
            category: e.category,
            indications: e.indications,
          })),
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        if (data.error.includes('Limite de requêtes') || data.error.includes('429')) {
          toast.error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
        } else if (data.error.includes('Crédits insuffisants') || data.error.includes('402')) {
          toast.error('Crédits IA insuffisants. Contactez l\'administrateur.');
        } else {
          throw new Error(data.error);
        }
        setError(data.error);
        return [];
      }

      // Map AI response to ExamRecommendation objects
      const aiRecommendations: ExamRecommendation[] = (data.recommendations || []).map(
        (rec: { examId: string; relevance: 'high' | 'medium' | 'low'; justification: string; matchedIndications: string[] }) => {
          const exam = exams.find(e => e.id === rec.examId);
          if (!exam) return null;
          return {
            exam,
            relevance: rec.relevance,
            justification: rec.justification,
            matchedIndications: rec.matchedIndications,
          };
        }
      ).filter(Boolean) as ExamRecommendation[];

      // Sort by relevance (high first)
      const sortedRecommendations = aiRecommendations.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.relevance] - order[b.relevance];
      });

      setRecommendations(sortedRecommendations);
      return sortedRecommendations;
    } catch (err) {
      console.error('Exam recommendations error:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la génération des recommandations';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [availableExams, loadAvailableExams]);

  const reset = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    getRecommendations,
    loadAvailableExams,
    reset,
    isLoading,
    recommendations,
    availableExams,
    error,
  };
}
