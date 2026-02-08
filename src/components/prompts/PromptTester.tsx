"use client";

import { useState } from 'react';
import { PromptVersion } from '@/lib/prompts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PromptTesterProps {
  version: PromptVersion | null;
}

export function PromptTester({ version }: PromptTesterProps) {
  const [input, setInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [actualOutput, setActualOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'passed' | 'failed' | null>(null);

  const handleTest = async () => {
    if (!version || !input.trim()) {
      toast.error('Veuillez saisir un message de test');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setActualOutput('');

    try {
      // TODO: Integrate with n8n webhook for actual testing
      // For now, simulate a test response
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const simulatedOutput = `[Simulation] Réponse pour: "${input.slice(0, 50)}..."`;
      setActualOutput(simulatedOutput);
      
      // Simple comparison if expected output is provided
      if (expectedOutput.trim()) {
        const passed = simulatedOutput.toLowerCase().includes(expectedOutput.toLowerCase());
        setTestResult(passed ? 'passed' : 'failed');
      } else {
        setTestResult('passed');
      }

      toast.success('Test exécuté');
    } catch (error) {
      console.error('Error testing prompt:', error);
      toast.error('Erreur lors du test');
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setExpectedOutput('');
    setActualOutput('');
    setTestResult(null);
  };

  if (!version) {
    return (
      <Card className="h-full" data-testid="prompt-tester">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">
            Sélectionnez une version pour la tester
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full" data-testid="prompt-tester">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Tester le prompt
          </CardTitle>
          <Badge variant="outline">v{version.version}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Input */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Label htmlFor="test-input" className="mb-1.5 text-sm">
            Message de test
          </Label>
          <Textarea
            id="test-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Entrez un message pour tester le prompt..."
            className="flex-1 text-sm resize-none"
            data-testid="test-input"
          />
        </div>

        {/* Expected output */}
        <div>
          <Label htmlFor="expected-output" className="mb-1.5 text-sm">
            Sortie attendue (optionnel)
          </Label>
          <Textarea
            id="expected-output"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder="Décrivez ce que vous attendez..."
            className="text-sm resize-none h-16"
            data-testid="expected-output"
          />
        </div>

        {/* Actual output */}
        {actualOutput && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm">Résultat</Label>
              {testResult === 'passed' && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Passé
                </Badge>
              )}
              {testResult === 'failed' && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Échoué
                </Badge>
              )}
            </div>
            <div
              className="flex-1 p-3 rounded-md bg-muted text-sm overflow-auto"
              data-testid="actual-output"
            >
              {actualOutput}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isTesting}
            data-testid="clear-test-button"
          >
            Effacer
          </Button>

          <Button
            size="sm"
            onClick={handleTest}
            disabled={isTesting || !input.trim()}
            data-testid="run-test-button"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Exécuter le test
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
