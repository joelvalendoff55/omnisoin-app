"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { useTranscriptAnalysis } from '@/hooks/useTranscriptAnalysis';
import { useAnamnesisRealtime } from '@/hooks/useAnamnesisRealtime';
import { AnamnesisCard } from './AnamnesisCard';
import { toast } from 'sonner';
import type { AnamnesisRecord } from '@/types/anamnesis';

interface AnamnesisSectionProps {
  patientId: string;
  structureId: string;
  transcript?: {
    id: string;
    transcript_text: string | null;
    recorder_type: string | null;
    consultation_id?: string | null;
    status: string;
  };
  showAnalyzeButton?: boolean;
}

export function AnamnesisSection({ 
  patientId, 
  structureId,
  transcript,
  showAnalyzeButton = true,
}: AnamnesisSectionProps) {
  const [anamneses, setAnamneses] = useState<AnamnesisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isAnalyzing, analyzeTranscript, getPatientAnamneses, getAnamnesis } = useTranscriptAnalysis();

  // Subscribe to realtime updates
  useAnamnesisRealtime({
    patientId,
    onUpdate: (updatedAnamnesis) => {
      setAnamneses(prev => {
        const exists = prev.find(a => a.id === updatedAnamnesis.id);
        if (exists) {
          return prev.map(a => a.id === updatedAnamnesis.id ? updatedAnamnesis : a);
        }
        return [updatedAnamnesis, ...prev];
      });
    },
  });

  // Load existing anamneses
  const loadAnamneses = useCallback(async () => {
    setLoading(true);
    const data = await getPatientAnamneses(patientId);
    setAnamneses(data);
    setLoading(false);
  }, [patientId, getPatientAnamneses]);

  useEffect(() => {
    loadAnamneses();
  }, [loadAnamneses]);

  // Check if current transcript already has an anamnesis
  const currentTranscriptAnamnesis = transcript 
    ? anamneses.find(a => a.transcript_id === transcript.id)
    : null;

  const handleAnalyze = async () => {
    if (!transcript || !transcript.transcript_text) {
      toast.error('Transcription non disponible', {
        description: 'Le texte de la transcription est requis pour l\'analyse',
      });
      return;
    }

    await analyzeTranscript(
      transcript.id,
      transcript.transcript_text,
      transcript.recorder_type || 'manual',
      patientId,
      structureId,
      transcript.consultation_id || undefined
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with analyze button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Anamnèses IA</h3>
          {anamneses.length > 0 && (
            <Badge variant="secondary">{anamneses.length}</Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnamneses}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {showAnalyzeButton && transcript && transcript.status === 'ready' && !currentTranscriptAnamnesis && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !transcript.transcript_text}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyser transcription
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Processing indicator */}
      {currentTranscriptAnamnesis?.status === 'processing' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              <div>
                <p className="font-medium">Analyse en cours...</p>
                <p className="text-sm text-muted-foreground">
                  L'IA analyse la transcription pour générer l'anamnèse structurée
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed analysis indicator */}
      {currentTranscriptAnamnesis?.status === 'failed' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Échec de l'analyse</p>
                <p className="text-sm text-muted-foreground">
                  Une erreur s'est produite lors de l'analyse
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anamnesis cards */}
      {anamneses
        .filter(a => a.status === 'completed')
        .map(anamnesis => (
          <div key={anamnesis.id} className="space-y-3">
            {anamnesis.assistant_summary && Object.keys(anamnesis.assistant_summary).length > 0 && (
              <AnamnesisCard
                type="assistant"
                summary={anamnesis.assistant_summary}
                confidenceScore={anamnesis.confidence_score}
                createdAt={anamnesis.created_at}
                processingTimeMs={anamnesis.processing_time_ms}
                anamnesisId={anamnesis.id}
                modelUsed={anamnesis.model_used}
              />
            )}
            {anamnesis.doctor_summary && Object.keys(anamnesis.doctor_summary).length > 0 && (
              <AnamnesisCard
                type="doctor"
                summary={anamnesis.doctor_summary}
                confidenceScore={anamnesis.confidence_score}
                createdAt={anamnesis.created_at}
                processingTimeMs={anamnesis.processing_time_ms}
                anamnesisId={anamnesis.id}
                modelUsed={anamnesis.model_used}
              />
            )}
          </div>
        ))}

      {/* Empty state */}
      {anamneses.filter(a => a.status === 'completed').length === 0 && !currentTranscriptAnamnesis && (
        <Card>
          <CardContent className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Aucune anamnèse IA disponible
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Les anamnèses seront générées automatiquement après chaque transcription
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}