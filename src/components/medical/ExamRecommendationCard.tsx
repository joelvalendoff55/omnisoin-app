"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TestTube2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
  Plus,
  Loader2,
} from 'lucide-react';
import { ExamRecommendation, RELEVANCE_LABELS, RELEVANCE_COLORS } from '@/lib/exams';
import { MedicalDisclaimer } from '@/components/medecin/MedicalDisclaimer';

interface ExamRecommendationCardProps {
  recommendations: ExamRecommendation[];
  isLoading: boolean;
  onPrescribe: (exam: ExamRecommendation) => Promise<void>;
  onRefresh?: () => void;
  hasContext: boolean;
}

export function ExamRecommendationCard({
  recommendations,
  isLoading,
  onPrescribe,
  onRefresh,
  hasContext,
}: ExamRecommendationCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [prescribingId, setPrescribingId] = useState<string | null>(null);

  const handlePrescribe = async (recommendation: ExamRecommendation) => {
    setPrescribingId(recommendation.exam.id);
    try {
      await onPrescribe(recommendation);
    } finally {
      setPrescribingId(null);
    }
  };

  const getRelevanceIcon = (relevance: ExamRecommendation['relevance']) => {
    switch (relevance) {
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <Info className="h-4 w-4" />;
    }
  };

  if (!hasContext && !isLoading && recommendations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Examens complémentaires</CardTitle>
          </div>
          <CardDescription>
            Renseignez le motif et les symptômes pour obtenir des recommandations d'examens
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Examens recommandés par l'IA</CardTitle>
              {recommendations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {recommendations.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && hasContext && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Actualiser'
                  )}
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <TestTube2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun examen complémentaire recommandé pour ce contexte clinique.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((recommendation) => (
                  <div
                    key={recommendation.exam.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${RELEVANCE_COLORS[recommendation.relevance]}`}>
                      {getRelevanceIcon(recommendation.relevance)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {recommendation.exam.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${RELEVANCE_COLORS[recommendation.relevance]}`}
                        >
                          {RELEVANCE_LABELS[recommendation.relevance]}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {recommendation.justification}
                      </p>

                      {recommendation.matchedIndications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recommendation.matchedIndications.slice(0, 3).map((indication, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {indication}
                            </Badge>
                          ))}
                          {recommendation.matchedIndications.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs">
                                  +{recommendation.matchedIndications.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {recommendation.matchedIndications.slice(3).join(', ')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}

                      {recommendation.exam.duration_minutes && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {recommendation.exam.duration_minutes >= 60
                              ? `${Math.floor(recommendation.exam.duration_minutes / 60)}h${
                                  recommendation.exam.duration_minutes % 60 > 0
                                    ? recommendation.exam.duration_minutes % 60 + 'min'
                                    : ''
                                }`
                              : `${recommendation.exam.duration_minutes} min`}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handlePrescribe(recommendation)}
                      disabled={prescribingId === recommendation.exam.id}
                      className="shrink-0"
                    >
                      {prescribingId === recommendation.exam.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Prescrire
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <MedicalDisclaimer variant="info" className="text-xs" />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
