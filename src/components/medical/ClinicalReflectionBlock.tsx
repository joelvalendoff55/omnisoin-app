import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
  Microscope,
  ShieldAlert,
  Stethoscope,
  Loader2,
  Search,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface ClinicalSuggestion {
  hypotheses: string[];
  differentials: string[];
  exams: string[];
  vigilancePoints: string[];
}

interface MultiLLMResponse {
  perplexityResponse: string | null;
  geminiResponse: string | null;
  sources: string[];
  error?: string;
}

interface ClinicalReflectionBlockProps {
  onRequestSuggestions?: () => Promise<ClinicalSuggestion | null>;
  suggestions?: ClinicalSuggestion | null;
  isLoading?: boolean;
  patientContext?: string;
  transcriptText?: string;
}

export function ClinicalReflectionBlock({
  onRequestSuggestions,
  suggestions: externalSuggestions,
  isLoading: externalLoading,
  patientContext = '',
  transcriptText = '',
}: ClinicalReflectionBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalSuggestions, setInternalSuggestions] = useState<ClinicalSuggestion | null>(null);
  const [multiLLMResponse, setMultiLLMResponse] = useState<MultiLLMResponse | null>(null);
  const [multiLLMLoading, setMultiLLMLoading] = useState(false);
  const [multiLLMError, setMultiLLMError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'research' | 'analysis' | 'diagnosis'>('analysis');

  const suggestions = externalSuggestions ?? internalSuggestions;
  const isLoading = externalLoading ?? internalLoading;

  const handleToggle = async () => {
    if (!isOpen && !suggestions && onRequestSuggestions) {
      setInternalLoading(true);
      try {
        const result = await onRequestSuggestions();
        setInternalSuggestions(result);
      } finally {
        setInternalLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleMultiLLMRequest = async () => {
    setMultiLLMLoading(true);
    setMultiLLMError(null);
    
    try {
      const prompt = transcriptText 
        ? `Analyse cette consultation médicale et fournis des pistes de réflexion clinique:\n\n${transcriptText}`
        : 'Fournis des pistes de réflexion clinique basées sur le contexte patient.';

      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt,
          patientContext: patientContext || 'Contexte patient non spécifié',
          mode: selectedMode,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'appel à l\'API');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setMultiLLMResponse(data as MultiLLMResponse);
    } catch (err) {
      console.error('Multi-LLM error:', err);
      setMultiLLMError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setMultiLLMLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
              onClick={handleToggle}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Aide à la réflexion
              </CardTitle>
              {isLoading || multiLLMLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Disclaimer */}
            <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                Pistes de réflexion à titre indicatif. Ne remplace pas le jugement clinique.
              </AlertDescription>
            </Alert>

            {/* Mode selector and action button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedMode === 'research' ? 'default' : 'outline'}
                  onClick={() => setSelectedMode('research')}
                  className="text-xs"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Recherche
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedMode === 'analysis' ? 'default' : 'outline'}
                  onClick={() => setSelectedMode('analysis')}
                  className="text-xs"
                >
                  <Stethoscope className="h-3 w-3 mr-1" />
                  Analyse
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedMode === 'diagnosis' ? 'default' : 'outline'}
                  onClick={() => setSelectedMode('diagnosis')}
                  className="text-xs"
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Diagnostic
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleMultiLLMRequest}
                disabled={multiLLMLoading}
                className="ml-auto"
              >
                {multiLLMLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : multiLLMResponse ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Relancer l'analyse
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Lancer l'analyse IA
                  </>
                )}
              </Button>
            </div>

            {/* Error display */}
            {multiLLMError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{multiLLMError}</AlertDescription>
              </Alert>
            )}

            {/* Loading state */}
            {multiLLMLoading && (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {/* Multi-LLM Response Display */}
            {multiLLMResponse && !multiLLMLoading && (
              <div className="space-y-4">
                <Tabs defaultValue="perplexity" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="perplexity" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Perplexity (Recherche)
                    </TabsTrigger>
                    <TabsTrigger value="gemini" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Gemini (Analyse)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="perplexity" className="mt-4">
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="pt-4">
                        {multiLLMResponse.perplexityResponse ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                              {multiLLMResponse.perplexityResponse}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Aucune réponse de Perplexity disponible.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="gemini" className="mt-4">
                    <Card className="border-purple-500/20 bg-purple-500/5">
                      <CardContent className="pt-4">
                        {multiLLMResponse.geminiResponse ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                              {multiLLMResponse.geminiResponse}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Aucune réponse de Gemini disponible.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Sources section */}
                {multiLLMResponse.sources && multiLLMResponse.sources.length > 0 && (
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Microscope className="h-4 w-4 text-green-600" />
                        Sources médicales ({multiLLMResponse.sources.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1">
                        {multiLLMResponse.sources.map((source, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="shrink-0">
                              {idx + 1}
                            </Badge>
                            <a
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate flex items-center gap-1"
                            >
                              {source}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Original suggestions display (fallback) */}
            {!multiLLMResponse && !multiLLMLoading && suggestions && (
              <div className="grid gap-4">
                <SuggestionSection
                  icon={<Brain className="h-4 w-4" />}
                  title="Hypothèses diagnostiques"
                  items={suggestions.hypotheses}
                  badgeVariant="default"
                />
                <SuggestionSection
                  icon={<Stethoscope className="h-4 w-4" />}
                  title="Diagnostics différentiels"
                  items={suggestions.differentials}
                  badgeVariant="secondary"
                />
                <SuggestionSection
                  icon={<Microscope className="h-4 w-4" />}
                  title="Examens à considérer"
                  items={suggestions.exams}
                  badgeVariant="outline"
                />
                <SuggestionSection
                  icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
                  title="Points de vigilance"
                  items={suggestions.vigilancePoints}
                  badgeVariant="destructive"
                  isWarning
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function SuggestionSection({
  icon,
  title,
  items,
  badgeVariant,
  isWarning = false,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  isWarning?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`p-3 rounded-lg ${isWarning ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <Badge variant={badgeVariant} className="mt-0.5 h-5 w-5 p-0 justify-center shrink-0">
              {idx + 1}
            </Badge>
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
