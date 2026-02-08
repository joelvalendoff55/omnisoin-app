import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  Plus,
  X,
  Lightbulb,
  Stethoscope,
  Microscope,
  History,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatDiagnosticAnalysis, DiagnosticAnalysis } from '@/lib/medecinFormatter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMedicalResearch } from '@/hooks/useMedicalResearch';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { SourcesList } from './SourcesList';
import { MedicalDisclaimer } from './MedicalDisclaimer';

// Mock analysis history
const MOCK_HISTORY: DiagnosticAnalysis[] = [
  {
    id: '1',
    symptoms: ['Douleur thoracique', 'Dyspnée', 'Fatigue'],
    clinical_signs: ['Tachycardie', 'Hypotension'],
    hypotheses: ['Syndrome coronarien aigu', 'Embolie pulmonaire'],
    differential_diagnoses: ['Péricardite', 'Dissection aortique', 'Pneumothorax'],
    recommended_exams: ['ECG 12 dérivations', 'Troponine', 'D-dimères', 'Radio thorax'],
    vigilance_points: ['Rechercher signes de gravité', 'Monitoring continu'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    patient_name: 'Martin Dupont',
  },
  {
    id: '2',
    symptoms: ['Céphalées intenses', 'Photophobie', 'Raideur de nuque'],
    clinical_signs: ['Fièvre 39.2°C', 'Signe de Kernig positif'],
    hypotheses: ['Méningite bactérienne', 'Méningite virale'],
    differential_diagnoses: ['Hémorragie méningée', 'Encéphalite'],
    recommended_exams: ['Ponction lombaire', 'Hémocultures', 'Scanner cérébral'],
    vigilance_points: ['Urgence thérapeutique', 'Isolement si méningocoque suspecté'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    patient_name: 'Sophie Bernard',
  },
];

export default function DiagnosticAidSection() {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [clinicalSigns, setClinicalSigns] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [newSign, setNewSign] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const { search, isLoading, result, reset } = useMedicalResearch({ mode: 'diagnostic' });

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

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const removeClinicalSign = (index: number) => {
    setClinicalSigns(clinicalSigns.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (symptoms.length === 0 && clinicalSigns.length === 0) return;

    const query = `Analyse diagnostique pour les éléments cliniques suivants`;
    
    await search(query, {
      symptoms,
      clinicalSigns,
      context: additionalContext,
    });
  };

  const clearForm = () => {
    setSymptoms([]);
    setClinicalSigns([]);
    setAdditionalContext('');
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <MedicalDisclaimer variant="warning" />

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Saisie des éléments cliniques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Symptoms Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Symptômes rapportés</label>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un symptôme..."
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
              />
              <Button onClick={addSymptom} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {symptom}
                  <button onClick={() => removeSymptom(idx)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Clinical Signs Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Signes cliniques</label>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un signe clinique..."
                value={newSign}
                onChange={(e) => setNewSign(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addClinicalSign()}
              />
              <Button onClick={addClinicalSign} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {clinicalSigns.map((sign, idx) => (
                <Badge key={idx} variant="outline" className="gap-1">
                  {sign}
                  <button onClick={() => removeClinicalSign(idx)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contexte additionnel (optionnel)</label>
            <Textarea
              placeholder="Antécédents pertinents, contexte de survenue, traitements en cours..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || (symptoms.length === 0 && clinicalSigns.length === 0)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Générer l'analyse
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearForm}>
              Effacer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {result && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Résultats de l'analyse
            </CardTitle>
            <div className="flex items-center gap-2">
              <ConfidenceIndicator 
                level={result.confidenceLevel} 
                reason={result.confidenceReason}
              />
              <CopyToClipboard
                text={result.content}
                label="Copier"
                variant="outline"
                size="sm"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* No reliable sources warning */}
            {!result.hasOfficialSources && result.confidenceLevel === 'none' && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Aucune source officielle disponible pour cette recherche
                  </span>
                </div>
              </div>
            )}

            {/* AI Response Content */}
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm">{result.content}</div>
              </div>
            </div>

            {/* Sources */}
            {result.sources.length > 0 && (
              <SourcesList sources={result.sources} className="pt-2" />
            )}

            {/* Footer Disclaimer */}
            <MedicalDisclaimer variant="info" />
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historique des analyses ({MOCK_HISTORY.length})
                </div>
                {historyOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {MOCK_HISTORY.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{analysis.patient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(analysis.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <CopyToClipboard
                          text={formatDiagnosticAnalysis(analysis)}
                          label="Copier"
                          variant="ghost"
                          size="sm"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysis.symptoms.slice(0, 3).map((s, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                        {analysis.symptoms.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{analysis.symptoms.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
