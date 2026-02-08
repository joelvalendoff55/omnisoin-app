import { useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';

export interface MedicalSource {
  title: string;
  url: string;
  type: 'has' | 'vidal' | 'pubmed' | 'ansm' | 'other';
}

export interface MedicalResearchResult {
  content: string;
  sources: MedicalSource[];
  confidenceLevel: 'high' | 'medium' | 'low' | 'none';
  confidenceReason: string;
  hasOfficialSources: boolean;
}

interface UseMedicalResearchOptions {
  mode: 'diagnostic' | 'reference';
}

export function useMedicalResearch({ mode }: UseMedicalResearchOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MedicalResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (
    query: string,
    options?: {
      symptoms?: string[];
      clinicalSigns?: string[];
      context?: string;
    }
  ) => {
    if (!query.trim()) {
      toast.error('Veuillez saisir une question');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('medical-research', {
        body: {
          query,
          mode,
          symptoms: options?.symptoms,
          clinicalSigns: options?.clinicalSigns,
          context: options?.context,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        if (data.error.includes('Limite de requêtes')) {
          toast.error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
        } else if (data.error.includes('Crédits insuffisants')) {
          toast.error('Crédits IA insuffisants. Contactez l\'administrateur.');
        } else {
          throw new Error(data.error);
        }
        setError(data.error);
        return null;
      }

      const researchResult: MedicalResearchResult = {
        content: data.content || '',
        sources: data.sources || [],
        confidenceLevel: data.confidenceLevel || 'none',
        confidenceReason: data.confidenceReason || '',
        hasOfficialSources: data.hasOfficialSources || false,
      };

      setResult(researchResult);
      return researchResult;
    } catch (err) {
      console.error('Medical research error:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la recherche';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    search,
    reset,
    isLoading,
    result,
    error,
  };
}
