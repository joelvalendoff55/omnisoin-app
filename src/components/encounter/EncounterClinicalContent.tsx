import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Stethoscope, 
  Activity, 
  Brain, 
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AnamneseSection } from '@/components/medecin/AnamneseSection';
import { VitalSignsSectionSafe } from '@/components/vitals';
import { ExamClinicalSection } from '@/components/medecin/ExamClinicalSection';
import { ClinicalDecisionSection } from '@/components/medecin/ClinicalDecisionSection';
import type { EncounterWithRelations, EncounterStatus, EncounterMode } from '@/types/encounter';

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

interface EncounterClinicalContentProps {
  encounter: EncounterWithRelations;
  onStatusChange: (status: EncounterStatus) => Promise<void>;
}

export function EncounterClinicalContent({ 
  encounter, 
  onStatusChange 
}: EncounterClinicalContentProps) {
  const [activeTab, setActiveTab] = useState('anamnese');
  const [examClinicalNotes, setExamClinicalNotes] = useState('');
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [clinicalReflection, setClinicalReflection] = useState<ClinicalReflection | null>(null);
  const [rawReflectionContent, setRawReflectionContent] = useState<string | null>(null);
  const [reflectionSources, setReflectionSources] = useState<Source[]>([]);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low' | 'none'>('none');

  const patientId = encounter.patient?.id;
  const structureId = encounter.structure_id;
  const isAssistedMode = encounter.mode === 'assisted';
  const isPreconsultPhase = ['preconsult_in_progress', 'preconsult_ready'].includes(encounter.status);
  const isConsultPhase = encounter.status === 'consultation_in_progress';
  const isCompleted = ['completed', 'cancelled'].includes(encounter.status);

  const handleGenerateReflection = useCallback(async (anamnese: string) => {
    if (!anamnese.trim()) return;
    
    setIsGeneratingReflection(true);
    try {
      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: anamnese,
          patientContext: `Patient: ${encounter.patient?.first_name} ${encounter.patient?.last_name}`,
          mode: 'clinical_reflection',
        },
      });

      if (error) throw error;

      const content = data.geminiResponse || data.perplexityResponse || '';
      setRawReflectionContent(content);
      
      // Parse structured response if available
      if (data.structured) {
        setClinicalReflection(data.structured);
        setConfidenceLevel(data.confidence || 'medium');
      }
      
      if (data.sources) {
        setReflectionSources(data.sources);
      }

      toast.success('Réflexion clinique générée');
    } catch (err) {
      console.error('Error generating reflection:', err);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGeneratingReflection(false);
    }
  }, [encounter.patient]);

  const handleExploreHypothesis = useCallback(async (hypothesis: string) => {
    toast.info(`Approfondissement de: ${hypothesis}`);
    // Future: Deep-dive into specific hypothesis
  }, []);

  // Determine available actions based on status
  const getStatusActions = () => {
    switch (encounter.status) {
      case 'created':
        return isAssistedMode
          ? [{ status: 'preconsult_in_progress' as EncounterStatus, label: 'Démarrer pré-consultation', variant: 'default' as const }]
          : [{ status: 'consultation_in_progress' as EncounterStatus, label: 'Démarrer consultation', variant: 'default' as const }];
      case 'preconsult_in_progress':
        return [{ status: 'preconsult_ready' as EncounterStatus, label: 'Marquer prêt pour médecin', variant: 'default' as const }];
      case 'preconsult_ready':
        return [{ status: 'consultation_in_progress' as EncounterStatus, label: 'Démarrer consultation', variant: 'default' as const }];
      case 'consultation_in_progress':
        return [
          { status: 'completed' as EncounterStatus, label: 'Terminer et clôturer', variant: 'default' as const },
          { status: 'cancelled' as EncounterStatus, label: 'Annuler', variant: 'outline' as const },
        ];
      default:
        return [];
    }
  };

  const statusActions = getStatusActions();

  if (isCompleted) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">
            {encounter.status === 'completed' ? 'Épisode terminé' : 'Épisode annulé'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Consultez l'historique dans la colonne de gauche
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status indicator and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPreconsultPhase && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Phase pré-consultation
            </Badge>
          )}
          {isConsultPhase && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
              Consultation en cours
            </Badge>
          )}
          {isAssistedMode && (
            <Badge variant="secondary" className="text-xs">
              Mode assisté
            </Badge>
          )}
        </div>
        
        {statusActions.length > 0 && (
          <div className="flex gap-2">
            {statusActions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                onClick={() => onStatusChange(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Clinical content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="anamnese" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            Anamnèse
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Constantes
          </TabsTrigger>
          <TabsTrigger value="exam" className="text-xs">
            <Stethoscope className="h-3 w-3 mr-1" />
            Examen
          </TabsTrigger>
          <TabsTrigger value="decision" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Décision
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-380px)] pr-4">
          <TabsContent value="anamnese" className="mt-0 space-y-4">
            <AnamneseSection
              onGenerateReflection={handleGenerateReflection}
              isGeneratingReflection={isGeneratingReflection}
              patientId={patientId}
              showAssistantTasks={isAssistedMode && isPreconsultPhase}
            />
          </TabsContent>

          <TabsContent value="vitals" className="mt-0">
            {patientId && structureId ? (
              <VitalSignsSectionSafe
                patientId={patientId}
                structureId={structureId}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Patient non associé à l'épisode</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exam" className="mt-0">
            <ExamClinicalSection
              value={examClinicalNotes}
              onChange={setExamClinicalNotes}
              readOnly={isCompleted}
            />
          </TabsContent>

          <TabsContent value="decision" className="mt-0">
            <ClinicalDecisionSection
              reflection={clinicalReflection}
              rawContent={rawReflectionContent}
              sources={reflectionSources}
              confidenceLevel={confidenceLevel}
              isLoading={isGeneratingReflection}
              onRefresh={() => {
                setClinicalReflection(null);
                setRawReflectionContent(null);
              }}
              onExploreHypothesis={handleExploreHypothesis}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Assistant notes display in assisted mode */}
      {isAssistedMode && encounter.queue_entry && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <FileText className="h-4 w-4" />
              Notes de l'assistante
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-sm">
              {(encounter.queue_entry as any).assistant_notes || 'Aucune note'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
