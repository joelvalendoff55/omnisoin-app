"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Lightbulb,
  Target,
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Shield,
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { MedicalDisclaimer } from './MedicalDisclaimer';

interface ClinicalReflection {
  hypotheses: string[];
  differentials: string[];
  semiologicalElements: string[];
  recommendedExams: string[];
  vigilancePoints: string[];
}

interface Source {
  title: string;
  url: string;
  type: 'has' | 'vidal' | 'pubmed' | 'ansm' | 'other';
}

interface ClinicalDecisionSectionProps {
  reflection: ClinicalReflection | null;
  sources?: Source[];
  confidenceLevel?: 'high' | 'medium' | 'low' | 'none';
  confidenceReason?: string;
  isLoading?: boolean;
  rawContent?: string | null;
  onRefresh?: () => void;
  onExploreHypothesis?: (hypothesis: string) => void;
}

// Confidence indicator component
function ConfidenceIndicatorEnhanced({ 
  level, 
  reason 
}: { 
  level: 'high' | 'medium' | 'low' | 'none';
  reason?: string;
}) {
  const config = {
    high: {
      label: 'Confiance élevée',
      icon: ShieldCheck,
      bgClass: 'bg-green-500/10',
      textClass: 'text-green-600 dark:text-green-400',
      borderClass: 'border-green-500/30',
    },
    medium: {
      label: 'Confiance modérée',
      icon: ShieldAlert,
      bgClass: 'bg-orange-500/10',
      textClass: 'text-orange-600 dark:text-orange-400',
      borderClass: 'border-orange-500/30',
    },
    low: {
      label: 'Confiance faible',
      icon: ShieldQuestion,
      bgClass: 'bg-red-500/10',
      textClass: 'text-red-600 dark:text-red-400',
      borderClass: 'border-red-500/30',
    },
    none: {
      label: 'Non évaluée',
      icon: Shield,
      bgClass: 'bg-muted',
      textClass: 'text-muted-foreground',
      borderClass: 'border-muted',
    },
  };

  const { label, icon: Icon, bgClass, textClass, borderClass } = config[level];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bgClass} ${borderClass} cursor-help`}>
          <Icon className={`h-4 w-4 ${textClass}`} />
          <span className={`text-xs font-medium ${textClass}`}>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{reason || `Niveau de confiance: ${label}`}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Source item with preview on hover
function SourceItem({ source }: { source: Source }) {
  const typeLabels: Record<string, string> = {
    has: 'HAS',
    vidal: 'Vidal',
    pubmed: 'PubMed',
    ansm: 'ANSM',
    other: 'Source',
  };

  const typeColors: Record<string, string> = {
    has: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    vidal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pubmed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ansm: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
    >
      <Badge variant="outline" className={`text-[10px] ${typeColors[source.type]}`}>
        {typeLabels[source.type]}
      </Badge>
      <span className="text-xs text-muted-foreground group-hover:text-foreground truncate flex-1">
        {source.title}
      </span>
      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// Hypothesis item with explore button
function HypothesisItem({ 
  hypothesis, 
  index, 
  onExplore 
}: { 
  hypothesis: string; 
  index: number;
  onExplore?: (hypothesis: string) => void;
}) {
  return (
    <li className="flex items-start gap-2 text-sm group">
      <Badge variant="default" className="mt-0.5 shrink-0">
        {index + 1}
      </Badge>
      <span className="flex-1">{hypothesis}</span>
      {onExplore && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onExplore(hypothesis)}
        >
          <Search className="h-3 w-3 mr-1" />
          <span className="text-xs">Approfondir</span>
        </Button>
      )}
    </li>
  );
}

export function ClinicalDecisionSection({
  reflection,
  sources = [],
  confidenceLevel = 'none',
  confidenceReason,
  isLoading = false,
  rawContent,
  onRefresh,
  onExploreHypothesis,
}: ClinicalDecisionSectionProps) {
  const [activeTab, setActiveTab] = useState('hypotheses');

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Analyse clinique en cours...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reflection && !rawContent) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Lightbulb className="h-8 w-8 opacity-50" />
            <p>Générez une anamnèse puis cliquez sur "Générer pistes de réflexion"</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Aide à la décision clinique</h2>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceIndicatorEnhanced level={confidenceLevel} reason={confidenceReason} />
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <MedicalDisclaimer variant="warning" />

      {/* Raw content display */}
      {rawContent && (
        <Card className="border-primary/20">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Analyse IA</span>
              <CopyToClipboard text={rawContent} variant="ghost" size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm">{rawContent}</div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Structured reflection display */}
      {reflection && (
        <Card>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="hypotheses" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Hypothèses
                </TabsTrigger>
                <TabsTrigger value="differentials" className="text-xs">
                  <Stethoscope className="h-3 w-3 mr-1" />
                  Différentiels
                </TabsTrigger>
                <TabsTrigger value="semiology" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sémiologie
                </TabsTrigger>
                <TabsTrigger value="exams" className="text-xs">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  Examens
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hypotheses" className="mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Hypothèses diagnostiques</h4>
                  {reflection.hypotheses.length > 0 ? (
                    <ul className="space-y-2">
                      {reflection.hypotheses.map((h, i) => (
                        <HypothesisItem 
                          key={i} 
                          hypothesis={h} 
                          index={i} 
                          onExplore={onExploreHypothesis}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune hypothèse générée</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="differentials" className="mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Diagnostics différentiels</h4>
                  {reflection.differentials.length > 0 ? (
                    <ul className="space-y-2">
                      {reflection.differentials.map((d, i) => (
                        <HypothesisItem 
                          key={i} 
                          hypothesis={d} 
                          index={i} 
                          onExplore={onExploreHypothesis}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun diagnostic différentiel</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="semiology" className="mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Éléments sémiologiques à rechercher</h4>
                  {reflection.semiologicalElements.length > 0 ? (
                    <ul className="space-y-2">
                      {reflection.semiologicalElements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun élément sémiologique</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="exams" className="mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Examens recommandés</h4>
                  {reflection.recommendedExams.length > 0 ? (
                    <ul className="space-y-2">
                      {reflection.recommendedExams.map((e, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <FlaskConical className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun examen recommandé</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Vigilance Points */}
            {reflection.vigilancePoints.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <h4 className="font-medium text-sm text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Points de vigilance
                </h4>
                <ul className="space-y-1">
                  {reflection.vigilancePoints.map((p, i) => (
                    <li key={i} className="text-sm text-destructive/80">• {p}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sources with clickable links */}
      {sources.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Sources ({sources.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {sources.map((source, i) => (
                <SourceItem key={i} source={source} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
