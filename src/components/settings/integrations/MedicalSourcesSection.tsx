import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';

interface MedicalSource {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  apiKey: string;
  color: string;
}

const DEFAULT_SOURCES: MedicalSource[] = [
  {
    id: 'has',
    name: 'HAS',
    description: 'Haute Autorité de Santé - Recommandations françaises',
    enabled: true,
    apiKey: '',
    color: 'blue',
  },
  {
    id: 'vidal',
    name: 'Vidal',
    description: 'Base de données médicamenteuse française',
    enabled: false,
    apiKey: '',
    color: 'red',
  },
  {
    id: 'prescrire',
    name: 'Prescrire',
    description: 'Revue indépendante sur les médicaments',
    enabled: false,
    apiKey: '',
    color: 'green',
  },
  {
    id: 'uptodate',
    name: 'UpToDate',
    description: 'Base de données clinique internationale',
    enabled: false,
    apiKey: '',
    color: 'purple',
  },
];

export default function MedicalSourcesSection() {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [medicalSources, setMedicalSources] = useState<MedicalSource[]>(DEFAULT_SOURCES);
  const [loadingSources, setLoadingSources] = useState(true);
  const [savingSources, setSavingSources] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id || !structureId) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings_value')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .eq('settings_key', 'medical_sources')
          .maybeSingle();

        if (error) throw error;

        if (data?.settings_value) {
          const savedSources = data.settings_value as unknown as MedicalSource[];
          const mergedSources = DEFAULT_SOURCES.map((defaultSource) => {
            const saved = savedSources.find((s) => s.id === defaultSource.id);
            return saved ? { ...defaultSource, ...saved } : defaultSource;
          });
          setMedicalSources(mergedSources);
        }
      } catch (error) {
        console.error('Error loading medical sources settings:', error);
      } finally {
        setLoadingSources(false);
      }
    };

    loadSettings();
  }, [user?.id, structureId]);

  const handleToggleSource = (sourceId: string) => {
    setMedicalSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleApiKeyChange = (sourceId: string, value: string) => {
    setMedicalSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, apiKey: value } : s))
    );
  };

  const toggleShowApiKey = (sourceId: string) => {
    setShowApiKeys((prev) => ({ ...prev, [sourceId]: !prev[sourceId] }));
  };

  const handleSaveMedicalSources = async () => {
    if (!user?.id || !structureId) {
      toast.error('Erreur', { description: 'Utilisateur non connecté' });
      return;
    }

    setSavingSources(true);
    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('structure_id', structureId)
        .eq('settings_key', 'medical_sources')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            settings_value: JSON.parse(JSON.stringify(medicalSources)),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('user_settings') as any).insert({
          user_id: user.id,
          structure_id: structureId,
          settings_key: 'medical_sources',
          settings_value: JSON.parse(JSON.stringify(medicalSources)),
        });

        if (error) throw error;
      }

      toast.success('Configuration sauvegardée', {
        description: 'Les sources médicales ont été mises à jour',
      });
    } catch (error) {
      console.error('Error saving medical sources:', error);
      toast.error('Erreur', { description: 'Impossible de sauvegarder la configuration' });
    } finally {
      setSavingSources(false);
    }
  };

  const getSourceColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600' },
      red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600' },
      green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Sources Médicales</CardTitle>
              <CardDescription>
                Configurez les sources de référence utilisées par l'IA pour enrichir les réponses
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadingSources ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {medicalSources.map((source) => {
                const colorClasses = getSourceColorClasses(source.color);
                return (
                  <div
                    key={source.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      source.enabled ? 'border-primary/30 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 ${colorClasses.bg} rounded-lg mt-0.5`}>
                          <BookOpen className={`h-4 w-4 ${colorClasses.text}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{source.name}</h4>
                            {source.enabled && (
                              <Badge variant="secondary" className="text-xs">
                                Actif
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {source.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={() => handleToggleSource(source.id)}
                      />
                    </div>

                    {source.enabled && (
                      <div className="mt-4 pl-11">
                        <Label htmlFor={`api-${source.id}`} className="text-sm text-muted-foreground">
                          Clé API (optionnel)
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id={`api-${source.id}`}
                            type={showApiKeys[source.id] ? 'text' : 'password'}
                            placeholder={`Clé API ${source.name}...`}
                            value={source.apiKey}
                            onChange={(e) => handleApiKeyChange(source.id, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleShowApiKey(source.id)}
                          >
                            {showApiKeys[source.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveMedicalSources} disabled={savingSources}>
                {savingSources ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder les sources
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note :</strong> Ces sources seront utilisées par l'assistant IA (Edge Function multi-llm) 
                pour enrichir les recherches médicales. Les clés API sont stockées de manière sécurisée et 
                ne sont accessibles que par votre compte.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
