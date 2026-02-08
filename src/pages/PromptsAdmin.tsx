import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { useRole } from '@/hooks/useRole';
import { usePromptAdmin } from '@/hooks/usePromptAdmin';
import { PromptList } from '@/components/prompts/PromptList';
import { PromptEditor } from '@/components/prompts/PromptEditor';
import { VersionHistory } from '@/components/prompts/VersionHistory';
import { PromptTester } from '@/components/prompts/PromptTester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Settings2 } from 'lucide-react';

export default function PromptsAdmin() {
  const { hasRole, loading: roleLoading } = useRole();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  const {
    prompts,
    versions,
    selectedPrompt,
    selectedVersion,
    publishedVersion,
    promptsLoading,
    versionsLoading,
    selectPrompt,
    selectVersion,
    createVersion,
    publishVersion,
    rollback,
    isCreating,
    isPublishing,
    isRollingBack,
  } = usePromptAdmin();

  // Check access
  const hasAccess = hasRole('prompt_admin') || hasRole('admin');

  // Build published versions map
  const publishedVersions = useMemo(() => {
    const map: Record<string, boolean> = {};
    prompts.forEach((p) => {
      // We'll need to track this per prompt - for now use a simple approach
      map[p.id] = false;
    });
    if (selectedPrompt && publishedVersion) {
      map[selectedPrompt.id] = true;
    }
    return map;
  }, [prompts, selectedPrompt, publishedVersion]);

  // Loading state
  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Accès refusé</h3>
              <p className="text-sm text-muted-foreground">
                Vous devez avoir le rôle prompt_admin ou admin pour accéder à cette page.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full" data-testid="prompts-admin-page">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Administration des Prompts</h1>
              <p className="text-sm text-muted-foreground">
                Gérez les prompts système de l'application
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Prompt list */}
          <div className="w-80 border-r bg-muted/30 flex-shrink-0">
            {promptsLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <PromptList
                prompts={prompts}
                selectedPromptId={selectedPrompt?.id || null}
                publishedVersions={publishedVersions}
                onSelect={selectPrompt}
                categoryFilter={categoryFilter}
                onCategoryFilter={setCategoryFilter}
              />
            )}
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedPrompt ? (
              <div className="flex-1 flex items-center justify-center">
                <Card className="max-w-md">
                  <CardContent className="pt-6 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Sélectionnez un prompt</h3>
                    <p className="text-sm text-muted-foreground">
                      Choisissez un prompt dans la liste pour voir ses versions et le modifier.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Editor area */}
                <div className="flex-1 p-4 overflow-auto">
                  <Tabs defaultValue="editor" className="h-full flex flex-col">
                    <TabsList className="flex-shrink-0 mb-4">
                      <TabsTrigger value="editor" data-testid="tab-editor">
                        Éditeur
                      </TabsTrigger>
                      <TabsTrigger value="tester" data-testid="tab-tester">
                        Testeur
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="flex-1 mt-0">
                      <PromptEditor
                        prompt={selectedPrompt}
                        currentVersion={selectedVersion || publishedVersion}
                        publishedVersion={publishedVersion}
                        onSave={async (content, notes) => {
                          await createVersion({ content, notes });
                        }}
                        onPublish={async (versionId) => { await publishVersion(versionId); }}
                        isSaving={isCreating}
                        isPublishing={isPublishing}
                      />
                    </TabsContent>

                    <TabsContent value="tester" className="flex-1 mt-0">
                      <PromptTester version={selectedVersion || publishedVersion} />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Version history sidebar */}
                <div className="w-72 border-l p-4 flex-shrink-0 overflow-hidden">
                  {versionsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : (
                    <VersionHistory
                      versions={versions}
                      selectedVersionId={selectedVersion?.id || null}
                      onSelect={selectVersion}
                      onRollback={async (versionId) => { await rollback(versionId); }}
                      isRollingBack={isRollingBack}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
