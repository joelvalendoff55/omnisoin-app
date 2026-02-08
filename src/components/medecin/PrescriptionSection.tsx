import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pill,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  Search,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { MedicalDisclaimer } from './MedicalDisclaimer';
import { PrescriptionTemplatesModal } from './PrescriptionTemplatesModal';

interface Medication {
  name: string;
  dosage: string;
}

interface PrescriptionAnalysis {
  interactions: Array<{
    severity: 'high' | 'medium' | 'low';
    description: string;
    medications: string[];
  }>;
  contraindications: string[];
  dosageSuggestions: Array<{
    medication: string;
    suggestion: string;
  }>;
  warnings: string[];
}

export function PrescriptionSection() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [patientContext, setPatientContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PrescriptionAnalysis | null>(null);
  const [rawAnalysis, setRawAnalysis] = useState<string | null>(null);

  const addMedication = () => {
    if (newMedName.trim()) {
      setMedications([...medications, { name: newMedName.trim(), dosage: newMedDosage.trim() }]);
      setNewMedName('');
      setNewMedDosage('');
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
    setAnalysis(null);
    setRawAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (medications.length === 0) {
      toast.error('Ajoutez au moins un médicament');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setRawAnalysis(null);

    try {
      const medicationsList = medications
        .map((m) => `- ${m.name}${m.dosage ? ` (${m.dosage})` : ''}`)
        .join('\n');

      const prompt = `Analyse cette prescription médicale et vérifie:
1. Les interactions médicamenteuses potentielles (avec niveau de gravité: élevé/modéré/faible)
2. Les contre-indications au vu du contexte patient
3. Les suggestions posologiques adaptées
4. Les points de vigilance

Médicaments prescrits:
${medicationsList}

${patientContext ? `Contexte patient: ${patientContext}` : ''}

IMPORTANT: Tu fournis des PISTES de réflexion. La décision finale appartient au prescripteur.`;

      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt,
          patientContext: patientContext || 'Vérification prescription',
          mode: 'analysis',
        },
      });

      if (error) throw error;

      const analysisText = data.geminiResponse || data.perplexityResponse || '';
      setRawAnalysis(analysisText);

      // Try to parse structured data from the response
      // For now, we'll show raw content - parsing can be improved later
      toast.success('Analyse terminée');
    } catch (err) {
      console.error('Error analyzing prescription:', err);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTemplateSelect = (templateMeds: Array<{ name: string; dosage: string }>, notes?: string) => {
    setMedications([...medications, ...templateMeds]);
    if (notes) {
      setPatientContext(prev => prev ? `${prev}\n${notes}` : notes);
    }
    toast.success('Template appliqué');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Prescription</h2>
        </div>
        <PrescriptionTemplatesModal onSelectTemplate={handleTemplateSelect} />
      </div>

      <MedicalDisclaimer variant="warning" />

      {/* Medication Input */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Médicaments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nom du médicament..."
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              className="flex-1"
            />
            <Input
              placeholder="Posologie..."
              value={newMedDosage}
              onChange={(e) => setNewMedDosage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              className="w-40"
            />
            <Button onClick={addMedication} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {medications.length > 0 && (
            <div className="space-y-2">
              {medications.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{med.name}</span>
                    {med.dosage && (
                      <Badge variant="secondary">{med.dosage}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMedication(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Patient Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contexte patient (optionnel)</label>
            <Textarea
              placeholder="Âge, poids, antécédents, allergies, insuffisance rénale/hépatique..."
              value={patientContext}
              onChange={(e) => setPatientContext(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || medications.length === 0}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Vérifier interactions et posologies
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {rawAnalysis && (
        <Card className="border-primary/20">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Analyse de la prescription
              </div>
              <CopyToClipboard text={rawAnalysis} variant="ghost" size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm">{rawAnalysis}</div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Cette analyse est fournie à titre indicatif. Vérifiez toujours avec le Vidal ou votre base de données médicamenteuse de référence.
        </AlertDescription>
      </Alert>
    </div>
  );
}
