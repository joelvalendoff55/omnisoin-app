import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Plus, 
  X, 
  Pill, 
  HeartPulse, 
  Stethoscope,
  Flag,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Antecedent } from '@/lib/antecedents';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ContentAuthorshipBadge } from './ContentAuthorshipBadge';

// Predefined common symptoms for quick selection
const COMMON_SYMPTOMS = [
  'Fièvre', 'Toux', 'Dyspnée', 'Douleur thoracique', 'Céphalées',
  'Nausées', 'Vomissements', 'Diarrhée', 'Fatigue', 'Vertiges',
  'Douleur abdominale', 'Lombalgie', 'Arthralgie', 'Myalgie',
  'Eruption cutanée', 'Prurit', 'Œdème', 'Palpitations', 'Syncope',
  'Dysurie', 'Pollakiurie', 'Constipation', 'Insomnie', 'Anxiété'
];

// Predefined red flags requiring immediate attention
const RED_FLAGS = [
  { id: 'chest_pain', label: 'Douleur thoracique aiguë', category: 'cardiovasculaire' },
  { id: 'dyspnea_acute', label: 'Dyspnée aiguë sévère', category: 'respiratoire' },
  { id: 'neuro_deficit', label: 'Déficit neurologique focal', category: 'neurologique' },
  { id: 'altered_consciousness', label: 'Trouble de la conscience', category: 'neurologique' },
  { id: 'severe_headache', label: 'Céphalée brutale intense', category: 'neurologique' },
  { id: 'hematemesis', label: 'Hématémèse', category: 'digestif' },
  { id: 'melena', label: 'Méléna / Rectorragies', category: 'digestif' },
  { id: 'anaphylaxis', label: 'Signes d\'anaphylaxie', category: 'allergique' },
  { id: 'suicidal', label: 'Idées suicidaires', category: 'psychiatrique' },
  { id: 'pregnancy_bleeding', label: 'Métrorragies (si grossesse)', category: 'obstétrique' },
  { id: 'high_fever', label: 'Fièvre > 40°C', category: 'infectieux' },
  { id: 'sepsis_signs', label: 'Signes de sepsis', category: 'infectieux' },
];

export interface StructuredAnamnesisData {
  motif: string;
  selectedSymptoms: string[];
  customSymptoms: string[];
  redFlags: Record<string, boolean>;
  freeText: string;
  // Auto-populated from patient file
  relevantAntecedents: Antecedent[];
}

interface StructuredAnamnesisProps {
  patientId?: string;
  antecedents?: Antecedent[];
  value?: Partial<StructuredAnamnesisData>;
  onChange?: (data: StructuredAnamnesisData) => void;
  onSubmit?: (data: StructuredAnamnesisData) => void;
  readOnly?: boolean;
  className?: string;
  /** Entity ID for authorship tracking */
  entityId?: string;
}

export function StructuredAnamnesis({
  patientId,
  antecedents = [],
  value,
  onChange,
  onSubmit,
  readOnly = false,
  className,
  entityId,
}: StructuredAnamnesisProps) {
  // Form state
  const [motif, setMotif] = useState(value?.motif || '');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(value?.selectedSymptoms || []);
  const [customSymptoms, setCustomSymptoms] = useState<string[]>(value?.customSymptoms || []);
  const [newSymptom, setNewSymptom] = useState('');
  const [redFlags, setRedFlags] = useState<Record<string, boolean>>(value?.redFlags || {});
  const [freeText, setFreeText] = useState(value?.freeText || '');
  
  // UI state
  const [symptomsExpanded, setSymptomsExpanded] = useState(true);
  const [redFlagsExpanded, setRedFlagsExpanded] = useState(true);

  // Filter relevant antecedents (active ones)
  const relevantAntecedents = antecedents.filter(a => a.actif);
  const allergies = relevantAntecedents.filter(a => a.type === 'allergique');
  const treatments = relevantAntecedents.filter(a => a.type === 'traitement_en_cours');
  const medicalHistory = relevantAntecedents.filter(a => a.type === 'medical');

  // Build current data object
  const getCurrentData = useCallback((): StructuredAnamnesisData => ({
    motif,
    selectedSymptoms,
    customSymptoms,
    redFlags,
    freeText,
    relevantAntecedents,
  }), [motif, selectedSymptoms, customSymptoms, redFlags, freeText, relevantAntecedents]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(getCurrentData());
  }, [motif, selectedSymptoms, customSymptoms, redFlags, freeText, onChange, getCurrentData]);

  // Toggle symptom selection
  const toggleSymptom = (symptom: string) => {
    if (readOnly) return;
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  // Add custom symptom
  const addCustomSymptom = () => {
    if (!newSymptom.trim() || readOnly) return;
    const symptom = newSymptom.trim();
    if (!customSymptoms.includes(symptom) && !selectedSymptoms.includes(symptom)) {
      setCustomSymptoms(prev => [...prev, symptom]);
      setSelectedSymptoms(prev => [...prev, symptom]);
    }
    setNewSymptom('');
  };

  // Remove custom symptom
  const removeCustomSymptom = (symptom: string) => {
    if (readOnly) return;
    setCustomSymptoms(prev => prev.filter(s => s !== symptom));
    setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
  };

  // Toggle red flag
  const toggleRedFlag = (flagId: string) => {
    if (readOnly) return;
    setRedFlags(prev => ({
      ...prev,
      [flagId]: !prev[flagId],
    }));
  };

  // Check if any red flags are active
  const hasActiveRedFlags = Object.values(redFlags).some(v => v);
  const activeRedFlagCount = Object.values(redFlags).filter(v => v).length;

  // Handle form submission
  const handleSubmit = () => {
    if (!motif.trim()) return;
    onSubmit?.(getCurrentData());
  };

  return (
    <Card className={cn('border-l-4 border-l-primary', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stethoscope className="h-5 w-5 text-primary" />
          Anamnèse Structurée
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Block 1: Motif (Required) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-medium">
              Motif de consultation <span className="text-destructive">*</span>
            </Label>
            {entityId && (
              <ContentAuthorshipBadge
                entityType="anamnesis"
                entityId={entityId}
                fieldName="motif"
                localSourceType="human_created"
                compact
              />
            )}
          </div>
          <Input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif principal de la consultation..."
            disabled={readOnly}
            className={cn(!motif.trim() && 'border-destructive/50')}
          />
        </div>

        <Separator />

        {/* Block 2: Symptômes clés (Chips) */}
        <Collapsible open={symptomsExpanded} onOpenChange={setSymptomsExpanded}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto font-medium hover:bg-transparent">
                <Label className="font-medium cursor-pointer flex items-center gap-2">
                  Symptômes clés
                  {selectedSymptoms.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedSymptoms.length}
                    </Badge>
                  )}
                  {symptomsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Label>
              </Button>
            </CollapsibleTrigger>
            {entityId && (
              <ContentAuthorshipBadge
                entityType="anamnesis"
                entityId={entityId}
                fieldName="symptoms"
                localSourceType="human_created"
                compact
              />
            )}
          </div>
          
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Predefined symptoms grid */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SYMPTOMS.map(symptom => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <Badge
                    key={symptom}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected && 'bg-primary',
                      !isSelected && 'hover:bg-muted',
                      readOnly && 'cursor-default'
                    )}
                    onClick={() => toggleSymptom(symptom)}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {symptom}
                  </Badge>
                );
              })}
            </div>

            {/* Custom symptoms input */}
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  placeholder="Ajouter un symptôme personnalisé..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSymptom())}
                  className="flex-1"
                />
                <Button onClick={addCustomSymptom} size="icon" variant="outline" disabled={!newSymptom.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Custom symptoms display */}
            {customSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customSymptoms.map(symptom => (
                  <Badge key={symptom} variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {symptom}
                    {!readOnly && (
                      <button onClick={() => removeCustomSymptom(symptom)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Block 3: ATCD Auto-rappel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-blue-600" />
              Antécédents & Traitements
              <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                <Bot className="h-3 w-3" />
                Auto-rappel
              </Badge>
            </Label>
          </div>

          {relevantAntecedents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun antécédent enregistré pour ce patient
            </p>
          ) : (
            <div className="space-y-2">
              {/* Allergies - Critical, always visible */}
              {allergies.length > 0 && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium text-sm mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Allergies ({allergies.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allergies.map(a => (
                      <Badge key={a.id} variant="destructive" className="text-xs">
                        {a.description}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Treatments */}
              {treatments.length > 0 && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium text-sm mb-1">
                    <Pill className="h-4 w-4" />
                    Traitements en cours ({treatments.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {treatments.map(t => (
                      <Badge key={t.id} variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                        {t.description}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical History Summary */}
              {medicalHistory.length > 0 && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium text-sm mb-1">
                    <HeartPulse className="h-4 w-4" />
                    Antécédents médicaux ({medicalHistory.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {medicalHistory.slice(0, 5).map(a => (
                      <Badge key={a.id} variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
                        {a.description}
                      </Badge>
                    ))}
                    {medicalHistory.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{medicalHistory.length - 5} autres
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Block 4: Red Flags (Yes/No) */}
        <Collapsible open={redFlagsExpanded} onOpenChange={setRedFlagsExpanded}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto font-medium hover:bg-transparent">
                <Label className={cn(
                  'font-medium cursor-pointer flex items-center gap-2',
                  hasActiveRedFlags && 'text-destructive'
                )}>
                  <Flag className={cn('h-4 w-4', hasActiveRedFlags ? 'text-destructive' : 'text-muted-foreground')} />
                  Drapeaux Rouges
                  {hasActiveRedFlags && (
                    <Badge variant="destructive" className="ml-1 animate-pulse">
                      {activeRedFlagCount} actif{activeRedFlagCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {redFlagsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Label>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {RED_FLAGS.map(flag => {
                const isActive = redFlags[flag.id] || false;
                return (
                  <div
                    key={flag.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg border transition-colors',
                      isActive 
                        ? 'bg-destructive/10 border-destructive/30' 
                        : 'bg-muted/30 border-transparent hover:bg-muted/50',
                      readOnly && 'cursor-default'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn(
                        'h-4 w-4',
                        isActive ? 'text-destructive' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm',
                        isActive && 'font-medium text-destructive'
                      )}>
                        {flag.label}
                      </span>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => toggleRedFlag(flag.id)}
                      disabled={readOnly}
                      className={cn(isActive && 'data-[state=checked]:bg-destructive')}
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Block 5: Free Text (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes libres
              <span className="text-xs text-muted-foreground font-normal">(facultatif)</span>
            </Label>
            {entityId && (
              <ContentAuthorshipBadge
                entityType="anamnesis"
                entityId={entityId}
                fieldName="free_text"
                localSourceType="human_created"
                compact
              />
            )}
          </div>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Éléments complémentaires, contexte de survenue, observations..."
            rows={3}
            disabled={readOnly}
          />
        </div>

        {/* Submit Button */}
        {onSubmit && !readOnly && (
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={!motif.trim()}
          >
            <Check className="h-4 w-4 mr-2" />
            Valider l'anamnèse
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
