"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Pill, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Clock,
  Info,
  XCircle,
  AlertCircle,
  CheckCircle2,
  FileDown,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAntecedents } from '@/hooks/useAntecedents';
import { useDrugInteractions, DrugInteraction } from '@/hooks/useDrugInteractions';
import { Antecedent, SEVERITY_COLORS, SEVERITY_LABELS } from '@/lib/antecedents';
import { MedicalDisclaimer } from '@/components/medecin/MedicalDisclaimer';
import { cn } from '@/lib/utils';
import { generateTreatmentsPdf } from '@/lib/treatmentsPdf';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TreatmentsSummaryViewProps {
  patientId: string;
  patientContext?: string;
}

function InteractionBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { 
      label: 'Majeure', 
      className: 'bg-red-100 text-red-800 border-red-300',
      icon: XCircle
    },
    medium: { 
      label: 'Modérée', 
      className: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: AlertCircle
    },
    low: { 
      label: 'Mineure', 
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: Info
    },
  };

  const { label, className, icon: Icon } = config[severity];

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function InteractionCard({ interaction }: { interaction: DrugInteraction }) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      interaction.severity === 'high' && 'bg-red-50 border-red-200',
      interaction.severity === 'medium' && 'bg-orange-50 border-orange-200',
      interaction.severity === 'low' && 'bg-yellow-50 border-yellow-200'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {interaction.medications.map((med, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {med}
            </Badge>
          ))}
        </div>
        <InteractionBadge severity={interaction.severity} />
      </div>
      <p className="text-sm text-muted-foreground">{interaction.description}</p>
    </div>
  );
}

function TreatmentItem({ treatment }: { treatment: Antecedent }) {
  const dateInfo = treatment.date_debut 
    ? format(new Date(treatment.date_debut), 'dd/MM/yyyy', { locale: fr })
    : null;

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      treatment.actif ? 'bg-card hover:bg-accent/50' : 'bg-muted/50 opacity-60'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill className="h-4 w-4 text-green-600" />
            <span className="font-medium">{treatment.description}</span>
            {!treatment.actif && (
              <Badge variant="outline" className="text-xs">Arrêté</Badge>
            )}
            {treatment.severity && (
              <Badge className={cn('text-xs', SEVERITY_COLORS[treatment.severity])}>
                {SEVERITY_LABELS[treatment.severity]}
              </Badge>
            )}
          </div>
          {treatment.notes && (
            <p className="text-sm text-muted-foreground mt-1 pl-6">{treatment.notes}</p>
          )}
        </div>
        {dateInfo && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Depuis {dateInfo}
          </span>
        )}
      </div>
    </div>
  );
}

export function TreatmentsSummaryView({ patientId, patientContext }: TreatmentsSummaryViewProps) {
  const { antecedents, loading, getByType, refresh } = useAntecedents(patientId);
  const { analyzing, result, error, analyzeTreatments, clearResult } = useDrugInteractions();
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [interactionsOpen, setInteractionsOpen] = useState(true);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const treatments = getByType('traitement_en_cours');
  const activeTreatments = treatments.filter(t => t.actif);
  const inactiveTreatments = treatments.filter(t => !t.actif);
  const allergies = getByType('allergique').filter(a => a.actif);

  // Auto-analyze on mount if there are treatments
  useEffect(() => {
    if (!loading && activeTreatments.length > 0 && !hasAnalyzed && !result) {
      handleAnalyze();
    }
  }, [loading, activeTreatments.length]);

  const handleAnalyze = async () => {
    setHasAnalyzed(true);
    await analyzeTreatments(activeTreatments, allergies, patientContext);
  };

  const handleRefresh = async () => {
    await refresh();
    clearResult();
    setHasAnalyzed(false);
  };

  const handleExportPdf = async () => {
    if (!patientId || !structureId) return;
    
    setExportingPdf(true);
    try {
      // Fetch patient info
      const { data: patient } = await supabase
        .from('patients')
        .select('first_name, last_name, dob')
        .eq('id', patientId)
        .single();

      // Fetch structure info
      const { data: structure } = await supabase
        .from('structures')
        .select('name, address, phone')
        .eq('id', structureId)
        .single();

      // Fetch current user profile for "generated by"
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      if (!patient || !structure) {
        throw new Error('Impossible de récupérer les informations');
      }

      await generateTreatmentsPdf({
        patient: {
          firstName: patient.first_name,
          lastName: patient.last_name,
          dateOfBirth: patient.dob || undefined,
        },
        structure: {
          name: structure.name,
          address: structure.address || undefined,
          phone: structure.phone || undefined,
        },
        treatments,
        allergies,
        interactionResult: result,
        generatedBy: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
      });

      toast.success('Rapport PDF généré avec succès');
    } catch (err) {
      console.error('Error generating treatments PDF:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // Count interactions by severity
  const highCount = result?.interactions.filter(i => i.severity === 'high').length || 0;
  const mediumCount = result?.interactions.filter(i => i.severity === 'medium').length || 0;
  const lowCount = result?.interactions.filter(i => i.severity === 'low').length || 0;
  const hasInteractions = (result?.interactions.length || 0) > 0;
  const hasWarnings = (result?.contraindications.length || 0) > 0 || (result?.warnings.length || 0) > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      highCount > 0 && 'border-red-300 shadow-red-100',
      highCount === 0 && mediumCount > 0 && 'border-orange-300 shadow-orange-100'
    )}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Traitements en cours
            {activeTreatments.length > 0 && (
              <Badge variant="secondary">{activeTreatments.length}</Badge>
            )}
            {highCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {highCount} interaction{highCount > 1 ? 's' : ''} majeure{highCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Vue synthétique des traitements avec détection d'interactions
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            title="Exporter en PDF"
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={analyzing}
          >
            <RefreshCw className={cn('h-4 w-4', analyzing && 'animate-spin')} />
          </Button>
          <Button
            variant={hasInteractions ? 'destructive' : 'default'}
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing || activeTreatments.length === 0}
            className="gap-2"
          >
            <ShieldAlert className="h-4 w-4" />
            {analyzing ? 'Analyse...' : 'Analyser'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Allergies Alert */}
        {allergies.length > 0 && (
          <Alert variant="destructive" className="bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Allergies déclarées</AlertTitle>
            <AlertDescription className="flex flex-wrap gap-1 mt-1">
              {allergies.map(a => (
                <Badge key={a.id} variant="destructive" className="text-xs">
                  {a.description}
                </Badge>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Interactions Results */}
        {result && (hasInteractions || hasWarnings) && (
          <Collapsible open={interactionsOpen} onOpenChange={setInteractionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={cn(
                    'h-5 w-5',
                    highCount > 0 ? 'text-red-600' : mediumCount > 0 ? 'text-orange-600' : 'text-yellow-600'
                  )} />
                  <span className="font-medium">
                    Résultats de l'analyse
                  </span>
                  <div className="flex gap-1">
                    {highCount > 0 && <Badge variant="destructive">{highCount} majeure{highCount > 1 ? 's' : ''}</Badge>}
                    {mediumCount > 0 && <Badge className="bg-orange-100 text-orange-800">{mediumCount} modérée{mediumCount > 1 ? 's' : ''}</Badge>}
                    {lowCount > 0 && <Badge className="bg-yellow-100 text-yellow-800">{lowCount} mineure{lowCount > 1 ? 's' : ''}</Badge>}
                  </div>
                </div>
                {interactionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {/* Drug Interactions */}
              {result.interactions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Interactions médicamenteuses
                  </h4>
                  <div className="space-y-2">
                    {result.interactions
                      .sort((a, b) => {
                        const order = { high: 0, medium: 1, low: 2 };
                        return order[a.severity] - order[b.severity];
                      })
                      .map((interaction, idx) => (
                        <InteractionCard key={idx} interaction={interaction} />
                      ))}
                  </div>
                </div>
              )}

              {/* Contraindications */}
              {result.contraindications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-red-700">
                    <XCircle className="h-4 w-4" />
                    Contre-indications
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                    {result.contraindications.map((ci, idx) => (
                      <li key={idx}>{ci}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-orange-700">
                    <Info className="h-4 w-4" />
                    Points de vigilance
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analysis timestamp */}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Analysé {formatDistanceToNow(result.analyzedAt, { locale: fr, addSuffix: true })}
              </p>

              <MedicalDisclaimer />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* No interactions found */}
        {result && !hasInteractions && !hasWarnings && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Aucune interaction détectée</AlertTitle>
            <AlertDescription className="text-green-700">
              L'analyse n'a pas détecté d'interaction médicamenteuse majeure entre les traitements en cours.
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur d'analyse</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Active Treatments List */}
        {activeTreatments.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Traitements actifs ({activeTreatments.length})
            </h4>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {activeTreatments.map(treatment => (
                  <TreatmentItem key={treatment.id} treatment={treatment} />
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun traitement en cours</p>
          </div>
        )}

        {/* Inactive Treatments (collapsed) */}
        {inactiveTreatments.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
                Traitements arrêtés ({inactiveTreatments.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {inactiveTreatments.map(treatment => (
                  <TreatmentItem key={treatment.id} treatment={treatment} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
