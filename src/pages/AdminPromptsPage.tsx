"use client";

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, FileText, Check, Search, History, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  notes: string | null;
  temperature: number | null;
  max_tokens: number | null;
}

interface SystemPromptWithContent {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  published_content: string | null;
  published_version_id: string | null;
  temperature: number | null;
  max_tokens: number | null;
}

async function getPromptsWithContent(): Promise<SystemPromptWithContent[]> {
  // First get all prompts
  const { data: prompts, error: promptsError } = await supabase
    .from('system_prompts')
    .select('*')
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });

  if (promptsError) throw promptsError;

  // Then get published versions for each prompt
  const promptsWithContent: SystemPromptWithContent[] = [];

  for (const prompt of prompts || []) {
    const { data: version } = await supabase
      .from('prompt_versions')
      .select('id, content, temperature, max_tokens')
      .eq('prompt_id', prompt.id)
      .eq('is_published', true)
      .maybeSingle();

    promptsWithContent.push({
      ...prompt,
      published_content: version?.content || null,
      published_version_id: version?.id || null,
      temperature: version?.temperature ?? prompt.temperature ?? 0.7,
      max_tokens: version?.max_tokens ?? prompt.max_tokens ?? 2048,
    });
  }

  return promptsWithContent;
}

async function getVersionsForPrompt(promptId: string): Promise<PromptVersion[]> {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false });

  if (error) throw error;
  return (data || []) as PromptVersion[];
}

export default function AdminPromptsPage() {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: roleLoading } = useRole();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [editedTemperatures, setEditedTemperatures] = useState<Record<string, number>>({});
  const [editedMaxTokens, setEditedMaxTokens] = useState<Record<string, number>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [rollingBackIds, setRollingBackIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const [versionsCache, setVersionsCache] = useState<Record<string, PromptVersion[]>>({});

  const { data: prompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ['admin-prompts-with-content'],
    queryFn: getPromptsWithContent,
    enabled: !!user,
  });

  // Initialize edited contents when prompts load
  useEffect(() => {
    const initialContents: Record<string, string> = {};
    const initialTemps: Record<string, number> = {};
    const initialTokens: Record<string, number> = {};
    
    prompts.forEach((p) => {
      if (p.published_content && !(p.id in editedContents)) {
        initialContents[p.id] = p.published_content;
      }
      if (!(p.id in editedTemperatures)) {
        initialTemps[p.id] = p.temperature ?? 0.7;
      }
      if (!(p.id in editedMaxTokens)) {
        initialTokens[p.id] = p.max_tokens ?? 2048;
      }
    });
    
    if (Object.keys(initialContents).length > 0) {
      setEditedContents((prev) => ({ ...initialContents, ...prev }));
    }
    if (Object.keys(initialTemps).length > 0) {
      setEditedTemperatures((prev) => ({ ...initialTemps, ...prev }));
    }
    if (Object.keys(initialTokens).length > 0) {
      setEditedMaxTokens((prev) => ({ ...initialTokens, ...prev }));
    }
  }, [prompts]);

  const saveMutation = useMutation({
    mutationFn: async ({ promptId, content, temperature, maxTokens }: { promptId: string; content: string; temperature: number; maxTokens: number }) => {
      if (!user) throw new Error('Non authentifié');

      // Create a new version and publish it
      const { data: versions, error: versionsError } = await supabase
        .from('prompt_versions')
        .select('version')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false })
        .limit(1);

      if (versionsError) throw versionsError;

      const nextVersion = (versions?.[0]?.version || 0) + 1;

      // Unpublish current versions
      await supabase
        .from('prompt_versions')
        .update({ is_published: false })
        .eq('prompt_id', promptId);

      // Create new published version
      const { error: insertError } = await supabase.from('prompt_versions').insert({
        prompt_id: promptId,
        version: nextVersion,
        content,
        temperature,
        max_tokens: maxTokens,
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: user.id,
        created_by: user.id,
        notes: 'Modifié via admin/prompts',
      });

      if (insertError) throw insertError;

      // Also update the system_prompts table
      await supabase
        .from('system_prompts')
        .update({ temperature, max_tokens: maxTokens })
        .eq('id', promptId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-prompts-with-content'] });
      // Clear version cache to refresh
      setVersionsCache((prev) => {
        const next = { ...prev };
        delete next[variables.promptId];
        return next;
      });
      toast.success('Prompt sauvegardé avec succès');
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.promptId);
        return next;
      });
    },
    onError: (error, variables) => {
      console.error('Error saving prompt:', error);
      toast.error('Erreur lors de la sauvegarde');
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.promptId);
        return next;
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async ({ promptId, version }: { promptId: string; version: PromptVersion }) => {
      if (!user) throw new Error('Non authentifié');

      // Get the latest version number
      const { data: versions, error: versionsError } = await supabase
        .from('prompt_versions')
        .select('version')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false })
        .limit(1);

      if (versionsError) throw versionsError;

      const nextVersion = (versions?.[0]?.version || 0) + 1;

      // Unpublish current versions
      await supabase
        .from('prompt_versions')
        .update({ is_published: false })
        .eq('prompt_id', promptId);

      // Create new version with old content
      const { error: insertError } = await supabase.from('prompt_versions').insert({
        prompt_id: promptId,
        version: nextVersion,
        content: version.content,
        temperature: version.temperature,
        max_tokens: version.max_tokens,
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: user.id,
        created_by: user.id,
        notes: `Rollback vers la version ${version.version}`,
      });

      if (insertError) throw insertError;

      // Update system_prompts table
      await supabase
        .from('system_prompts')
        .update({ 
          temperature: version.temperature, 
          max_tokens: version.max_tokens 
        })
        .eq('id', promptId);

      return { content: version.content, temperature: version.temperature, maxTokens: version.max_tokens };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-prompts-with-content'] });
      // Update local state
      setEditedContents((prev) => ({ ...prev, [variables.promptId]: data.content }));
      if (data.temperature !== null) {
        setEditedTemperatures((prev) => ({ ...prev, [variables.promptId]: data.temperature! }));
      }
      if (data.maxTokens !== null) {
        setEditedMaxTokens((prev) => ({ ...prev, [variables.promptId]: data.maxTokens! }));
      }
      // Clear version cache
      setVersionsCache((prev) => {
        const next = { ...prev };
        delete next[variables.promptId];
        return next;
      });
      toast.success(`Rollback vers la version ${variables.version.version} effectué`);
      setRollingBackIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.promptId);
        return next;
      });
    },
    onError: (error, variables) => {
      console.error('Error rolling back:', error);
      toast.error('Erreur lors du rollback');
      setRollingBackIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.promptId);
        return next;
      });
    },
  });

  const handleContentChange = (promptId: string, content: string) => {
    setEditedContents((prev) => ({ ...prev, [promptId]: content }));
  };

  const handleTemperatureChange = (promptId: string, value: number) => {
    setEditedTemperatures((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleMaxTokensChange = (promptId: string, value: number) => {
    setEditedMaxTokens((prev) => ({ ...prev, [promptId]: value }));
  };

  const handleSave = (promptId: string) => {
    const content = editedContents[promptId];
    if (!content) return;

    const temperature = editedTemperatures[promptId] ?? 0.7;
    const maxTokens = editedMaxTokens[promptId] ?? 2048;

    setSavingIds((prev) => new Set(prev).add(promptId));
    saveMutation.mutate({ promptId, content, temperature, maxTokens });
  };

  const handleRollback = (promptId: string, version: PromptVersion) => {
    setRollingBackIds((prev) => new Set(prev).add(promptId));
    rollbackMutation.mutate({ promptId, version });
  };

  const toggleHistory = async (promptId: string) => {
    const isExpanded = expandedHistoryIds.has(promptId);
    if (isExpanded) {
      setExpandedHistoryIds((prev) => {
        const next = new Set(prev);
        next.delete(promptId);
        return next;
      });
    } else {
      // Fetch versions if not cached
      if (!versionsCache[promptId]) {
        try {
          const versions = await getVersionsForPrompt(promptId);
          setVersionsCache((prev) => ({ ...prev, [promptId]: versions }));
        } catch (error) {
          console.error('Error fetching versions:', error);
          toast.error('Erreur lors du chargement des versions');
          return;
        }
      }
      setExpandedHistoryIds((prev) => new Set(prev).add(promptId));
    }
  };

  const hasChanges = (prompt: SystemPromptWithContent) => {
    const editedContent = editedContents[prompt.id];
    const editedTemp = editedTemperatures[prompt.id];
    const editedTokens = editedMaxTokens[prompt.id];
    
    const contentChanged = editedContent !== undefined && editedContent !== (prompt.published_content || '');
    const tempChanged = editedTemp !== undefined && editedTemp !== (prompt.temperature ?? 0.7);
    const tokensChanged = editedTokens !== undefined && editedTokens !== (prompt.max_tokens ?? 2048);
    
    return contentChanged || tempChanged || tokensChanged;
  };

  // Access control
  if (authLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const hasAccess = hasRole('admin') || hasRole('prompt_admin');

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Accès refusé</CardTitle>
              <CardDescription>
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Filter prompts by search query
  const filteredPrompts = prompts.filter((prompt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = prompt.display_name.toLowerCase().includes(query);
    const matchesSlug = prompt.slug.toLowerCase().includes(query);
    const matchesDescription = prompt.description?.toLowerCase().includes(query);
    const matchesContent = editedContents[prompt.id]?.toLowerCase().includes(query) ||
      prompt.published_content?.toLowerCase().includes(query);
    return matchesName || matchesSlug || matchesDescription || matchesContent;
  });

  // Group prompts by category
  const promptsByCategory = filteredPrompts.reduce(
    (acc, prompt) => {
      const cat = prompt.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(prompt);
      return acc;
    },
    {} as Record<string, SystemPromptWithContent[]>
  );

  const categoryLabels: Record<string, string> = {
    assistant: 'Assistant',
    summary: 'Résumé',
    transcription: 'Transcription',
    analysis: 'Analyse',
    clinical_suggestions: 'Suggestions cliniques',
    ocr_extraction: 'Extraction OCR',
    stt_processing: 'Traitement STT',
    summary_generator: 'Générateur de résumé',
    transcript_cleaner: 'Nettoyage transcription',
    assistant_system: 'Système assistant',
    other: 'Autre',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Administration des Prompts
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les prompts système de l'application
            </p>
          </div>
          <Badge variant="outline">{filteredPrompts.length} / {prompts.length} prompts</Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, slug ou contenu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {promptsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">
                  {categoryLabels[category] || category}
                </h2>

                <div className="grid gap-4">
                  {categoryPrompts.map((prompt) => {
                    const isSaving = savingIds.has(prompt.id);
                    const changed = hasChanges(prompt);

                    return (
                      <Card key={prompt.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {prompt.display_name}
                                {prompt.is_active ? (
                                  <Badge variant="default" className="text-xs">
                                    Actif
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    Inactif
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {prompt.slug}
                                </code>
                                {prompt.description && (
                                  <span className="ml-2">{prompt.description}</span>
                                )}
                              </CardDescription>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSave(prompt.id)}
                              disabled={isSaving || !changed}
                            >
                              {isSaving ? (
                                <>Sauvegarde...</>
                              ) : changed ? (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Sauvegarder
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Sauvegardé
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Temperature and Max Tokens sliders */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`temp-${prompt.id}`}>Temperature</Label>
                                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                  {(editedTemperatures[prompt.id] ?? prompt.temperature ?? 0.7).toFixed(2)}
                                </span>
                              </div>
                              <Slider
                                id={`temp-${prompt.id}`}
                                min={0}
                                max={2}
                                step={0.01}
                                value={[editedTemperatures[prompt.id] ?? prompt.temperature ?? 0.7]}
                                onValueChange={([value]) => handleTemperatureChange(prompt.id, value)}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                0 = déterministe, 2 = très créatif
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`tokens-${prompt.id}`}>Max Tokens</Label>
                                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                  {editedMaxTokens[prompt.id] ?? prompt.max_tokens ?? 2048}
                                </span>
                              </div>
                              <Slider
                                id={`tokens-${prompt.id}`}
                                min={256}
                                max={128000}
                                step={256}
                                value={[editedMaxTokens[prompt.id] ?? prompt.max_tokens ?? 2048]}
                                onValueChange={([value]) => handleMaxTokensChange(prompt.id, value)}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                Longueur maximale de la réponse
                              </p>
                            </div>
                          </div>

                          {/* Prompt content */}
                          <div className="space-y-2">
                            <Label htmlFor={`prompt-${prompt.id}`}>Contenu du prompt</Label>
                            <Textarea
                              id={`prompt-${prompt.id}`}
                              value={editedContents[prompt.id] ?? prompt.published_content ?? ''}
                              onChange={(e) => handleContentChange(prompt.id, e.target.value)}
                              placeholder="Aucun contenu publié..."
                              className="font-mono text-sm min-h-[150px]"
                            />
                          </div>

                          {/* Version history */}
                          <Collapsible
                            open={expandedHistoryIds.has(prompt.id)}
                            onOpenChange={() => toggleHistory(prompt.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-between">
                                <span className="flex items-center gap-2">
                                  <History className="h-4 w-4" />
                                  Historique des versions
                                </span>
                                {expandedHistoryIds.has(prompt.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3">
                              <ScrollArea className="h-[200px] rounded-md border p-3">
                                {versionsCache[prompt.id]?.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Aucune version disponible
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {versionsCache[prompt.id]?.map((version) => (
                                      <div
                                        key={version.id}
                                        className={`p-3 rounded-lg border transition-colors ${
                                          version.is_published 
                                            ? 'bg-primary/5 border-primary' 
                                            : 'bg-muted/50 hover:bg-muted'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                              Version {version.version}
                                            </span>
                                            {version.is_published && (
                                              <Badge variant="default" className="text-xs">
                                                <Check className="h-3 w-3 mr-1" />
                                                Publiée
                                              </Badge>
                                            )}
                                          </div>
                                          {!version.is_published && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRollback(prompt.id, version)}
                                              disabled={rollingBackIds.has(prompt.id)}
                                              className="h-7 text-xs"
                                            >
                                              <RotateCcw className="h-3 w-3 mr-1" />
                                              Rollback
                                            </Button>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(version.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                        </p>
                                        {version.notes && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {version.notes}
                                          </p>
                                        )}
                                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                          <span>Temp: {version.temperature ?? 0.7}</span>
                                          <span>Tokens: {version.max_tokens ?? 2048}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </ScrollArea>
                            </CollapsibleContent>
                          </Collapsible>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucun prompt système trouvé.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
