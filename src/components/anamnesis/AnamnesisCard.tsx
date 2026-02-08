import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Stethoscope,
  FileText,
  Clock,
  Activity,
  Bot,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AssistantSummary, DoctorSummary } from '@/types/anamnesis';
import { ContentAuthorshipBadge } from '@/components/medical/ContentAuthorshipBadge';

interface AnamnesisCardProps {
  type: 'assistant' | 'doctor';
  summary: AssistantSummary | DoctorSummary;
  confidenceScore?: number | null;
  createdAt?: string;
  processingTimeMs?: number | null;
  /** Anamnesis record ID for authorship tracking */
  anamnesisId?: string;
  /** Model used for AI generation */
  modelUsed?: string | null;
}

const urgencyColors = {
  faible: 'bg-green-100 text-green-800 border-green-200',
  modéré: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  élevé: 'bg-orange-100 text-orange-800 border-orange-200',
  critique: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
};

const probabilityColors = {
  haute: 'bg-red-100 text-red-700',
  moyenne: 'bg-yellow-100 text-yellow-700',
  faible: 'bg-blue-100 text-blue-700',
};

export function AnamnesisCard({ 
  type, 
  summary, 
  confidenceScore, 
  createdAt,
  processingTimeMs,
  anamnesisId,
  modelUsed
}: AnamnesisCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isAssistant = type === 'assistant';
  const assistantData = isAssistant ? (summary as AssistantSummary) : null;
  const doctorData = !isAssistant ? (summary as DoctorSummary) : null;

  // Determine source type based on card type
  const sourceType = isAssistant ? 'ai_generated' : 'ai_assisted';
  const sourceLabel = isAssistant ? 'Généré par IA' : 'Assisté par IA';
  const SourceIcon = isAssistant ? Bot : User;

  return (
    <Card className="border-l-4 border-l-primary">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAssistant ? (
                <FileText className="h-5 w-5 text-blue-600" />
              ) : (
                <Stethoscope className="h-5 w-5 text-purple-600" />
              )}
              <CardTitle className="text-lg">
                {isAssistant ? 'Résumé Assistante' : 'Anamnèse Médecin'}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {/* AI/Human Attribution Badge */}
              {anamnesisId ? (
                <ContentAuthorshipBadge
                  entityType="anamnesis"
                  entityId={anamnesisId}
                  fieldName={isAssistant ? 'assistant_summary' : 'doctor_summary'}
                  compact
                />
              ) : (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'gap-1 text-xs',
                    isAssistant 
                      ? 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' 
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                  )}
                >
                  <SourceIcon className="h-3 w-3" />
                  {sourceLabel}
                  {modelUsed && <span className="opacity-75 ml-1">({modelUsed})</span>}
                </Badge>
              )}

              {confidenceScore && (
                <Badge variant="outline" className="gap-1">
                  <Brain className="h-3 w-3" />
                  {Math.round(confidenceScore * 100)}%
                </Badge>
              )}
              
              {assistantData?.niveau_urgence && (
                <Badge className={cn('gap-1', urgencyColors[assistantData.niveau_urgence])}>
                  <AlertTriangle className="h-3 w-3" />
                  {assistantData.niveau_urgence.charAt(0).toUpperCase() + assistantData.niveau_urgence.slice(1)}
                </Badge>
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          {createdAt && (
            <p className="text-xs text-muted-foreground">
              Généré le {format(new Date(createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
              {processingTimeMs && ` (${(processingTimeMs / 1000).toFixed(1)}s)`}
            </p>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Assistant Summary */}
            {assistantData && (
              <>
                {assistantData.motif && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-muted-foreground">Motif de consultation</h4>
                      <Badge variant="secondary" className="text-[10px] gap-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        <Bot className="h-2.5 w-2.5" />
                        IA
                      </Badge>
                    </div>
                    <p className="text-sm">{assistantData.motif}</p>
                  </div>
                )}

                {assistantData.symptomes_principaux && assistantData.symptomes_principaux.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-muted-foreground">Symptômes principaux</h4>
                      <Badge variant="secondary" className="text-[10px] gap-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        <Bot className="h-2.5 w-2.5" />
                        IA
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {assistantData.symptomes_principaux.map((s, i) => (
                        <Badge key={i} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {assistantData.antecedents_pertinents && assistantData.antecedents_pertinents.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-muted-foreground">Antécédents pertinents</h4>
                      <Badge variant="secondary" className="text-[10px] gap-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        <Bot className="h-2.5 w-2.5" />
                        IA
                      </Badge>
                    </div>
                    <ul className="text-sm list-disc list-inside">
                      {assistantData.antecedents_pertinents.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {assistantData.infos_admin && (
                  <div className="grid grid-cols-2 gap-4">
                    {assistantData.infos_admin.traitements_en_cours && assistantData.infos_admin.traitements_en_cours.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm text-muted-foreground">Traitements en cours</h4>
                          <Badge variant="secondary" className="text-[10px] gap-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                            <Bot className="h-2.5 w-2.5" />
                            IA
                          </Badge>
                        </div>
                        <ul className="text-sm list-disc list-inside">
                          {assistantData.infos_admin.traitements_en_cours.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assistantData.infos_admin.allergies && assistantData.infos_admin.allergies.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            Allergies
                          </h4>
                          <Badge variant="secondary" className="text-[10px] gap-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                            <Bot className="h-2.5 w-2.5" />
                            IA
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {assistantData.infos_admin.allergies.map((a, i) => (
                            <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {assistantData.justification_urgence && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Justification du niveau d'urgence</h4>
                    <p className="text-sm text-muted-foreground">{assistantData.justification_urgence}</p>
                  </div>
                )}
              </>
            )}

            {/* Doctor Summary */}
            {doctorData && (
              <>
                {doctorData.histoire_maladie && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Histoire de la maladie</h4>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg">{doctorData.histoire_maladie}</p>
                  </div>
                )}

                {doctorData.symptomes_details && doctorData.symptomes_details.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Symptômes détaillés</h4>
                    <div className="space-y-2">
                      {doctorData.symptomes_details.map((s, i) => (
                        <div key={i} className="bg-muted/30 p-2 rounded text-sm">
                          <span className="font-medium">{s.symptome}</span>
                          {s.debut && <span className="text-muted-foreground"> • Début: {s.debut}</span>}
                          {s.intensite && <span className="text-muted-foreground"> • Intensité: {s.intensite}</span>}
                          {s.evolution && <p className="text-muted-foreground mt-1">Évolution: {s.evolution}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doctorData.antecedents && (
                  <div className="grid grid-cols-2 gap-4">
                    {doctorData.antecedents.medicaux && doctorData.antecedents.medicaux.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Antécédents médicaux</h4>
                        <ul className="text-sm list-disc list-inside">
                          {doctorData.antecedents.medicaux.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                    {doctorData.antecedents.chirurgicaux && doctorData.antecedents.chirurgicaux.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Antécédents chirurgicaux</h4>
                        <ul className="text-sm list-disc list-inside">
                          {doctorData.antecedents.chirurgicaux.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                    {doctorData.antecedents.familiaux && doctorData.antecedents.familiaux.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Antécédents familiaux</h4>
                        <ul className="text-sm list-disc list-inside">
                          {doctorData.antecedents.familiaux.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {doctorData.facteurs && (
                  <div className="grid grid-cols-2 gap-4">
                    {doctorData.facteurs.aggravants && doctorData.facteurs.aggravants.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-red-600 mb-1">Facteurs aggravants</h4>
                        <ul className="text-sm list-disc list-inside">
                          {doctorData.facteurs.aggravants.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                    {doctorData.facteurs.soulageants && doctorData.facteurs.soulageants.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-green-600 mb-1">Facteurs soulageants</h4>
                        <ul className="text-sm list-disc list-inside">
                          {doctorData.facteurs.soulageants.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {doctorData.hypotheses_diagnostiques && doctorData.hypotheses_diagnostiques.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      Hypothèses diagnostiques
                    </h4>
                    <div className="space-y-2">
                      {doctorData.hypotheses_diagnostiques.map((h, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{h.diagnostic}</span>
                            {h.probabilite && (
                              <Badge className={cn('text-xs', probabilityColors[h.probabilite])}>
                                {h.probabilite}
                              </Badge>
                            )}
                          </div>
                          {h.arguments && h.arguments.length > 0 && (
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {h.arguments.map((a, j) => <li key={j}>{a}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doctorData.examens_suggeres && doctorData.examens_suggeres.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Examens complémentaires suggérés</h4>
                    <div className="space-y-2">
                      {doctorData.examens_suggeres.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 bg-muted/30 p-2 rounded">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{e.examen}</span>
                            {e.urgence && (
                              <Badge variant="outline" className="ml-2 text-xs">{e.urgence}</Badge>
                            )}
                            {e.justification && (
                              <p className="text-xs text-muted-foreground mt-1">{e.justification}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}