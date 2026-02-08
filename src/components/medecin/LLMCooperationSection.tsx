import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Send,
  Loader2,
  ExternalLink,
  Sparkles,
  Search,
  MessageSquare,
  History,
  AlertTriangle,
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatLLMResponse, LLMQuery } from '@/lib/medecinFormatter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MODEL_OPTIONS = [
  { value: 'perplexity', label: 'Perplexity', icon: Search, description: 'Recherche avec sources' },
  { value: 'gemini', label: 'Google Gemini', icon: Sparkles, description: 'Analyse approfondie' },
  { value: 'chatgpt', label: 'ChatGPT', icon: MessageSquare, description: 'Conversation libre' },
];

// Mock history
const MOCK_HISTORY: LLMQuery[] = [
  {
    id: '1',
    model: 'perplexity',
    query: 'Quelles sont les recommandations HAS 2024 pour la prise en charge de l\'HTA ?',
    response: 'Selon les recommandations HAS 2024, la prise en charge de l\'hypertension artérielle repose sur plusieurs piliers : mesures hygiéno-diététiques, seuils tensionnels personnalisés selon le profil de risque cardiovasculaire, et choix thérapeutique adapté...',
    sources: [
      'https://www.has-sante.fr/jcms/c_2059286/fr/hypertension-arterielle',
      'https://www.sfhta.eu/recommandations',
    ],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    model: 'gemini',
    query: 'Diagnostic différentiel d\'une douleur abdominale aiguë chez l\'adulte',
    response: 'Le diagnostic différentiel d\'une douleur abdominale aiguë chez l\'adulte doit considérer la localisation, l\'irradiation, les signes associés. Les étiologies principales incluent : appendicite, cholécystite, pancréatite, occlusion intestinale, perforation d\'ulcère, pathologies gynécologiques chez la femme...',
    sources: [],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function LLMCooperationSection() {
  const [selectedModel, setSelectedModel] = useState<string>('perplexity');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<LLMQuery | null>(null);
  const [activeTab, setActiveTab] = useState('query');

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    
    // Simulate API call (will be replaced with actual LLM integration)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    const mockResponse: LLMQuery = {
      id: Date.now().toString(),
      model: selectedModel as 'perplexity' | 'gemini' | 'chatgpt',
      query: query.trim(),
      response: `Réponse simulée du modèle ${selectedModel}. Cette fonctionnalité sera connectée aux APIs LLM (Perplexity, Gemini, ChatGPT) pour fournir des réponses médicales avec sources vérifiables. En attendant, voici un exemple de format de réponse structurée...`,
      sources: selectedModel === 'perplexity' ? [
        'https://exemple-source-medicale.fr/article1',
        'https://exemple-reference.org/guide',
      ] : [],
      created_at: new Date().toISOString(),
    };

    setCurrentResponse(mockResponse);
    setIsLoading(false);
    setActiveTab('response');
  };

  const selectedModelInfo = MODEL_OPTIONS.find((m) => m.value === selectedModel);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Interface de coopération avec les modèles d'IA. Les réponses sont fournies à titre informatif et doivent être vérifiées.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistant IA Médical
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Modèle</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un modèle" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      <model.icon className="h-4 w-4" />
                      <span>{model.label}</span>
                      <span className="text-xs text-muted-foreground">- {model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="query">Requête</TabsTrigger>
              <TabsTrigger value="response" disabled={!currentResponse}>
                Réponse
              </TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="query" className="space-y-4 mt-4">
              <Textarea
                placeholder="Posez votre question médicale..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                className="resize-none"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !query.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Interrogation de {selectedModelInfo?.label}...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer à {selectedModelInfo?.label}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setQuery('')}>
                  Effacer
                </Button>
              </div>

              {/* Quick Prompts */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Suggestions rapides :</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Recommandations HAS récentes',
                    'Interactions médicamenteuses',
                    'Protocole de prise en charge',
                    'Diagnostic différentiel',
                  ].map((prompt) => (
                    <Badge
                      key={prompt}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setQuery(prompt)}
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="response" className="mt-4">
              {currentResponse && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {MODEL_OPTIONS.find((m) => m.value === currentResponse.model)?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(currentResponse.created_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <CopyToClipboard
                      text={formatLLMResponse(currentResponse)}
                      label="Copier"
                      variant="outline"
                      size="sm"
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-2">Question :</p>
                    <p className="text-sm text-muted-foreground mb-4">{currentResponse.query}</p>
                    
                    <p className="text-sm font-medium mb-2">Réponse :</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {currentResponse.response}
                    </p>
                  </div>

                  {currentResponse.sources.length > 0 && (
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Sources ({currentResponse.sources.length})
                      </p>
                      <ul className="space-y-1">
                        {currentResponse.sources.map((source, idx) => (
                          <li key={idx} className="text-xs">
                            <a
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {source}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {MOCK_HISTORY.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {MODEL_OPTIONS.find((m) => m.value === item.model)?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <CopyToClipboard
                          text={formatLLMResponse(item)}
                          label="Copier"
                          variant="ghost"
                          size="sm"
                        />
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{item.query}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.response}
                      </p>
                      {item.sources.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {item.sources.length} source(s)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* API Status */}
      <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Mode démonstration :</strong> Les APIs LLM seront connectées prochainement. Les réponses actuelles sont simulées.
        </AlertDescription>
      </Alert>
    </div>
  );
}
