import { useState, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';
import type { AnamnesisRecord } from '@/types/anamnesis';

interface AnalysisResult {
  success: boolean;
  anamnesisId?: string;
  confidenceScore?: number;
  processingTimeMs?: number;
  summary?: Record<string, unknown>;
  error?: string;
}

export function useTranscriptAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  const analyzeTranscript = useCallback(async (
    transcriptId: string,
    transcriptText: string,
    recorderType: string,
    patientId: string,
    structureId: string,
    consultationId?: string
  ): Promise<AnalysisResult> => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-transcript', {
        body: {
          transcriptId,
          transcriptText,
          recorderType,
          patientId,
          structureId,
          consultationId,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result: AnalysisResult = {
        success: true,
        anamnesisId: data.anamnesisId,
        confidenceScore: data.confidenceScore,
        processingTimeMs: data.processingTimeMs,
        summary: data.summary,
      };

      setLastResult(result);
      toast.success('Analyse terminée', {
        description: `Confiance: ${Math.round((data.confidenceScore || 0) * 100)}%`,
      });

      return result;
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      // Handle specific errors
      if (errorMessage.includes('Rate limit')) {
        toast.error('Limite de requêtes atteinte', {
          description: 'Veuillez réessayer dans quelques instants',
        });
      } else if (errorMessage.includes('Payment required')) {
        toast.error('Crédits insuffisants', {
          description: 'Veuillez recharger vos crédits IA',
        });
      } else {
        toast.error("Erreur lors de l'analyse", {
          description: errorMessage,
        });
      }

      const result: AnalysisResult = {
        success: false,
        error: errorMessage,
      };
      
      setLastResult(result);
      return result;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getAnamnesis = useCallback(async (transcriptId: string): Promise<AnamnesisRecord | null> => {
    try {
      const { data, error } = await supabase
        .from('consultation_anamnesis')
        .select('*')
        .eq('transcript_id', transcriptId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found
          return null;
        }
        throw error;
      }

      return data as AnamnesisRecord;
    } catch (error) {
      console.error('Error fetching anamnesis:', error);
      return null;
    }
  }, []);

  const getPatientAnamneses = useCallback(async (patientId: string): Promise<AnamnesisRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('consultation_anamnesis')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AnamnesisRecord[];
    } catch (error) {
      console.error('Error fetching patient anamneses:', error);
      return [];
    }
  }, []);

  return {
    isAnalyzing,
    lastResult,
    analyzeTranscript,
    getAnamnesis,
    getPatientAnamneses,
  };
}