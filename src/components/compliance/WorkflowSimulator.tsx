"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ClipboardList,
  FileText,
  CheckSquare,
  Phone,
  Stethoscope,
  LogOut,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { simulatePatientWorkflow, type WorkflowSimulationResult } from '@/lib/systemHealth';
import { useStructureId } from '@/hooks/useStructureId';

const STEP_ICONS: Record<string, React.ElementType> = {
  patient_created: User,
  added_to_queue: ClipboardList,
  preconsultation_created: FileText,
  consent_obtained: CheckSquare,
  patient_called: Phone,
  consultation_created: Stethoscope,
  consultation_completed: LogOut,
  audit_logs_verified: Shield,
};

const STEP_LABELS: Record<string, string> = {
  patient_created: 'Patient créé',
  added_to_queue: 'Ajouté à la file',
  preconsultation_created: 'Pré-consultation créée',
  consent_obtained: 'Consentement obtenu',
  patient_called: 'Patient appelé',
  consultation_created: 'Consultation créée',
  consultation_completed: 'Consultation terminée',
  audit_logs_verified: 'Logs d\'audit vérifiés',
};

export function WorkflowSimulator() {
  const { structureId } = useStructureId();
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<WorkflowSimulationResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: () => simulatePatientWorkflow(structureId!, dryRun),
    onSuccess: (data) => {
      setResult(data);
      const success = data.successful_steps === data.total_steps;
      if (success) {
        toast.success('Simulation terminée avec succès');
      } else {
        toast.warning(`Simulation terminée avec ${data.total_steps - data.successful_steps} erreur(s)`);
      }
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  if (!structureId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune structure associée
        </CardContent>
      </Card>
    );
  }

  const progressPercent = result
    ? (result.successful_steps / result.total_steps) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Simulateur de Workflow Patient
          </CardTitle>
          <CardDescription>
            Teste le workflow complet : arrivée → enregistrement → pré-consultation → consultation → sortie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="dry-run"
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <Label htmlFor="dry-run">Mode simulation (dry run)</Label>
            </div>
            
            {!dryRun && (
              <Alert variant="destructive" className="flex-1">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                  Le mode réel créera de vraies données de test dans la base.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => simulateMutation.mutate()}
              disabled={simulateMutation.isPending}
              size="lg"
            >
              {simulateMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Simulation en cours...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Lancer la simulation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Résultats de la Simulation</CardTitle>
                <CardDescription>
                  {result.dry_run ? 'Mode simulation' : 'Mode réel'} -{' '}
                  {format(new Date(result.started_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                </CardDescription>
              </div>
              <Badge
                className={cn(
                  result.successful_steps === result.total_steps
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                )}
              >
                {result.successful_steps}/{result.total_steps} étapes réussies
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress
                value={progressPercent}
                className={cn(
                  'h-2',
                  progressPercent === 100 ? 'bg-green-100' : 'bg-yellow-100'
                )}
              />
            </div>

            <Separator />

            {/* Steps Timeline */}
            <div className="space-y-4">
              <h4 className="font-medium">Étapes du workflow</h4>
              <div className="relative">
                {result.steps.map((step, index) => {
                  const Icon = STEP_ICONS[step.name] || CheckCircle2;
                  const label = STEP_LABELS[step.name] || step.name;
                  
                  return (
                    <div key={index} className="flex gap-4 pb-4 last:pb-0">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            step.success
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          )}
                        >
                          {step.success ? (
                            <Icon className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        {index < result.steps.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              Étape {step.step}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {step.duration_ms}ms
                            </Badge>
                            {step.success ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        {/* Step details */}
                        {Object.entries(step).some(
                          ([key]) =>
                            !['step', 'name', 'success', 'duration_ms'].includes(key)
                        ) && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            {Object.entries(step)
                              .filter(
                                ([key]) =>
                                  !['step', 'name', 'success', 'duration_ms'].includes(key)
                              )
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className="font-mono">{String(value)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Created Entities (if not dry run) */}
            {!result.dry_run && result.entities_created && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Entités créées</h4>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(result.entities_created).map(([key, value]) => (
                      <div
                        key={key}
                        className="p-2 bg-muted rounded text-sm flex justify-between"
                      >
                        <span className="text-muted-foreground">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-mono text-xs truncate ml-2 max-w-[150px]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
