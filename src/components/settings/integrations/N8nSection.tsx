import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Webhook,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  ExternalLink,
  Plug,
  Workflow,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  configured: boolean;
  tokenConfigured?: boolean;
  status?: number;
  message: string;
}

// Mock active workflows
const MOCK_WORKFLOWS = [
  { id: '1', name: 'Transcription → Résumé', status: 'active', lastRun: '2024-01-15T14:30:00', executions: 156 },
  { id: '2', name: 'Alerte Passage Hospitalier', status: 'active', lastRun: '2024-01-15T12:15:00', executions: 42 },
  { id: '3', name: 'Sync Google Calendar', status: 'inactive', lastRun: '2024-01-10T09:00:00', executions: 89 },
  { id: '4', name: 'Export Omnidoc', status: 'active', lastRun: '2024-01-15T16:45:00', executions: 234 },
];

export default function N8nSection() {
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null);

  const handleTestWebhook = async () => {
    setTesting(true);
    setLastTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('trigger-summary', {
        body: { type: 'ping' },
      });

      if (error) {
        setLastTestResult({
          success: false,
          configured: false,
          message: `Erreur: ${error.message}`,
        });
        toast.error('Test échoué', { description: error.message });
        return;
      }

      const result = data as TestResult;
      setLastTestResult(result);

      if (result.success) {
        toast.success('Connexion n8n OK ✅', { description: result.message });
      } else {
        toast.error('Test échoué', { description: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setLastTestResult({ success: false, configured: false, message });
      toast.error('Erreur lors du test', { description: message });
    } finally {
      setTesting(false);
    }
  };

  const formatLastRun = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Webhook className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>n8n - Automatisation</CardTitle>
              <CardDescription>
                Workflows automatisés et intégrations
              </CardDescription>
            </div>
          </div>
          {lastTestResult ? (
            lastTestResult.success ? (
              <Badge className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connecté
              </Badge>
            ) : lastTestResult.configured ? (
              <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <XCircle className="h-3 w-3 mr-1" />
                Erreur connexion
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Non configuré
              </Badge>
            )
          ) : (
            <Badge variant="secondary">
              <Plug className="h-3 w-3 mr-1" />
              Non testé
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Les secrets <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">N8N_SUMMARY_WEBHOOK</code> et{' '}
            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">N8N_TOKEN</code> sont gérés côté serveur 
            pour des raisons de sécurité. Utilisez le bouton ci-dessous pour vérifier la connexion.
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Vérification de la connexion</h4>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleTestWebhook}
              disabled={testing}
              variant="outline"
              className="gap-2"
              data-testid="settings-webhook-test"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {testing ? 'Test en cours...' : 'Tester la connexion n8n'}
            </Button>

            {lastTestResult && (
              <div className="flex items-center gap-2">
                {lastTestResult.success ? (
                  <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {!lastTestResult.configured ? 'Non configuré' : 'Erreur'}
                  </Badge>
                )}
                <span
                  className={`text-sm ${
                    lastTestResult.success ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  {lastTestResult.message}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Active Workflows */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Workflows actifs
            </h4>
            <Badge variant="outline">{MOCK_WORKFLOWS.filter(w => w.status === 'active').length} actifs</Badge>
          </div>
          
          <div className="border rounded-lg divide-y">
            {MOCK_WORKFLOWS.map((workflow) => (
              <div key={workflow.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${workflow.status === 'active' ? 'bg-green-500' : 'bg-muted'}`} />
                  <div>
                    <p className="text-sm font-medium">{workflow.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Dernière exécution: {formatLastRun(workflow.lastRun)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {workflow.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{workflow.executions} exécutions</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <a
            href="/docs/n8n_summary_runbook.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Voir la documentation d'intégration
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
