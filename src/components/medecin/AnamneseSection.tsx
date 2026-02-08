import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  Upload,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  X,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicalDisclaimer } from './MedicalDisclaimer';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { AssistantGeneratedTasks } from '@/components/assistant/AssistantGeneratedTasks';
import { VoiceDictation } from './VoiceDictation';

interface AnamnesesectionProps {
  onAnamneseChange?: (anamnese: string) => void;
  onGenerateReflection?: (anamnese: string) => void;
  isGeneratingReflection?: boolean;
  showAssistantTasks?: boolean;
  patientId?: string;
  transcriptId?: string;
}

export function AnamneseSection({
  onAnamneseChange,
  onGenerateReflection,
  isGeneratingReflection = false,
  showAssistantTasks = false,
  patientId,
  transcriptId,
}: AnamnesesectionProps) {
  const [anamnese, setAnamnese] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  
  // Manual symptoms/signs input (legacy form)
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [clinicalSigns, setClinicalSigns] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [newSign, setNewSign] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  const handleAnamneseChange = (value: string) => {
    setAnamnese(value);
    onAnamneseChange?.(value);
  };

  const handleImportTranscript = async () => {
    if (!transcriptText.trim()) {
      toast.error('Veuillez coller une transcription');
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: `Génère une anamnèse structurée à partir de cette transcription de consultation:\n\n${transcriptText}`,
          patientContext: 'Transcription de consultation',
          mode: 'analysis',
        },
      });

      if (error) throw error;

      const generatedAnamnese = data.geminiResponse || data.perplexityResponse || '';
      handleAnamneseChange(generatedAnamnese);
      setTranscriptText('');
      toast.success('Anamnèse générée avec succès');
    } catch (err) {
      console.error('Error generating anamnesis:', err);
      toast.error('Erreur lors de la génération de l\'anamnèse');
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualGenerate = async () => {
    if (symptoms.length === 0 && clinicalSigns.length === 0 && !additionalContext) {
      toast.error('Veuillez saisir au moins un élément clinique');
      return;
    }

    setIsImporting(true);
    try {
      const clinicalData = [
        symptoms.length > 0 ? `Symptômes: ${symptoms.join(', ')}` : '',
        clinicalSigns.length > 0 ? `Signes cliniques: ${clinicalSigns.join(', ')}` : '',
        additionalContext ? `Contexte: ${additionalContext}` : '',
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: `Génère une anamnèse structurée à partir des éléments cliniques suivants:\n\n${clinicalData}`,
          patientContext: clinicalData,
          mode: 'analysis',
        },
      });

      if (error) throw error;

      const generatedAnamnese = data.geminiResponse || data.perplexityResponse || '';
      handleAnamneseChange(generatedAnamnese);
      toast.success('Anamnèse générée avec succès');
    } catch (err) {
      console.error('Error generating anamnesis:', err);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsImporting(false);
    }
  };

  const addSymptom = () => {
    if (newSymptom.trim()) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom('');
    }
  };

  const addClinicalSign = () => {
    if (newSign.trim()) {
      setClinicalSigns([...clinicalSigns, newSign.trim()]);
      setNewSign('');
    }
  };

  const handleGenerateReflection = () => {
    if (!anamnese.trim()) {
      toast.error('Veuillez d\'abord saisir ou générer une anamnèse');
      return;
    }
    onGenerateReflection?.(anamnese);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Anamnèse</h2>
      </div>

      <MedicalDisclaimer variant="info" />

      {/* Import Transcription */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer une transcription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Collez ici la transcription de la consultation..."
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            rows={4}
          />
          <Button
            onClick={handleImportTranscript}
            disabled={isImporting || !transcriptText.trim()}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer l'anamnèse (IA)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Clinical Input (Collapsible) */}
      <Collapsible open={showManualInput} onOpenChange={setShowManualInput}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Saisie manuelle des éléments cliniques
                </div>
                {showManualInput ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Symptoms */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Symptômes rapportés</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un symptôme..."
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom())}
                  />
                  <Button onClick={addSymptom} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {symptom}
                      <button onClick={() => setSymptoms(symptoms.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Clinical Signs */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Signes cliniques</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un signe clinique..."
                    value={newSign}
                    onChange={(e) => setNewSign(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addClinicalSign())}
                  />
                  <Button onClick={addClinicalSign} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clinicalSigns.map((sign, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      {sign}
                      <button onClick={() => setClinicalSigns(clinicalSigns.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Context */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Contexte additionnel</label>
                <Textarea
                  placeholder="Antécédents pertinents, contexte de survenue..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleManualGenerate}
                disabled={isImporting || (symptoms.length === 0 && clinicalSigns.length === 0 && !additionalContext)}
                variant="outline"
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Générer depuis éléments cliniques
                  </>
                )}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Anamnese Text Area */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Anamnèse
              <VoiceDictation 
                onTranscript={(text) => handleAnamneseChange(anamnese + (anamnese ? ' ' : '') + text)}
              />
            </div>
            {anamnese && (
              <CopyToClipboard text={anamnese} variant="ghost" size="sm" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="L'anamnèse sera générée ici ou vous pouvez la saisir manuellement..."
            value={anamnese}
            onChange={(e) => handleAnamneseChange(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          
          <Button
            onClick={handleGenerateReflection}
            disabled={!anamnese.trim() || isGeneratingReflection}
            className="w-full"
            variant="default"
          >
            {isGeneratingReflection ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération des pistes de réflexion...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer pistes de réflexion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Assistant Tasks Section - shows after anamnesis is generated */}
      {showAssistantTasks && anamnese.trim() && (
        <AssistantGeneratedTasks
          anamnesis={anamnese}
          patientId={patientId}
          transcriptId={transcriptId}
        />
      )}
    </div>
  );
}
