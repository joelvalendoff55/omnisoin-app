"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, Mail, Database, Plug, Bot, Eye, EyeOff, Key } from 'lucide-react';
import { useState } from 'react';

interface LLMConfig {
  name: string;
  keyName: string;
  configured: boolean;
  maskedKey: string;
}

const LLM_CONFIGS: LLMConfig[] = [
  { name: 'Perplexity', keyName: 'PERPLEXITY_API_KEY', configured: true, maskedKey: 'pplx-****...****7a2f' },
  { name: 'Gemini (Google)', keyName: 'GEMINI_API_KEY', configured: true, maskedKey: 'AIza****...****Xk9Q' },
  { name: 'OpenAI', keyName: 'OPENAI_API_KEY', configured: true, maskedKey: 'sk-****...****' },
  { name: 'Claude (Anthropic)', keyName: 'ANTHROPIC_API_KEY', configured: true, maskedKey: 'sk-ant-****...****' },
];

export default function FutureIntegrationsSection() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (keyName: string) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  return (
    <div className="space-y-6">
      {/* LLM API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle>APIs LLM</CardTitle>
              <CardDescription>
                Configuration des clés API pour les modèles de langage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Les clés API sont stockées de manière sécurisée côté serveur et ne sont jamais exposées 
              au client. Elles sont utilisées par les edge functions pour les appels LLM.
            </p>
          </div>

          <div className="space-y-4">
            {LLM_CONFIGS.map((llm) => (
              <div key={llm.keyName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{llm.name}</p>
                    <code className="text-xs text-muted-foreground">{llm.keyName}</code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {llm.configured ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showKeys[llm.keyName] ? 'text' : 'password'}
                          value={llm.maskedKey}
                          readOnly
                          className="w-40 h-8 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(llm.keyName)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showKeys[llm.keyName] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Badge className="bg-green-600">Configurée</Badge>
                    </>
                  ) : (
                    <Badge variant="secondary">Non configurée</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Pour modifier les clés API, contactez l'administrateur ou utilisez les secrets Cloud.
          </p>
        </CardContent>
      </Card>

      {/* Future Integrations */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Plug className="h-5 w-5" />
            Intégrations à venir
          </CardTitle>
          <CardDescription>
            Ces fonctionnalités seront disponibles prochainement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* DMP */}
            <div className="flex items-center gap-3 p-4 border rounded-lg opacity-60">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">DMP</p>
                <p className="text-xs text-muted-foreground">Dossier Médical Partagé</p>
              </div>
            </div>

            {/* MSS */}
            <div className="flex items-center gap-3 p-4 border rounded-lg opacity-60">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Mail className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">MSS</p>
                <p className="text-xs text-muted-foreground">Messagerie Sécurisée</p>
              </div>
            </div>

            {/* API Externe */}
            <div className="flex items-center gap-3 p-4 border rounded-lg opacity-60">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Database className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">API SIH</p>
                <p className="text-xs text-muted-foreground">Système d'Information</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
