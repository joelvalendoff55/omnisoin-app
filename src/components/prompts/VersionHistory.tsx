import { PromptVersion } from '@/lib/prompts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, RotateCcw, Check } from 'lucide-react';

interface VersionHistoryProps {
  versions: PromptVersion[];
  selectedVersionId: string | null;
  onSelect: (version: PromptVersion) => void;
  onRollback: (versionId: string) => Promise<void>;
  isRollingBack: boolean;
}

export function VersionHistory({
  versions,
  selectedVersionId,
  onSelect,
  onRollback,
  isRollingBack,
}: VersionHistoryProps) {
  return (
    <Card className="flex flex-col h-full" data-testid="version-history">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique des versions
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 pt-0 space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune version créée
              </p>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors cursor-pointer',
                    'hover:bg-accent',
                    selectedVersionId === version.id && 'bg-accent border-primary'
                  )}
                  onClick={() => onSelect(version)}
                  data-testid={`version-item-${version.version}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Version {version.version}</span>
                      {version.is_published && (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Publié
                        </Badge>
                      )}
                    </div>

                    {!version.is_published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRollback(version.id);
                        }}
                        disabled={isRollingBack}
                        className="h-7 text-xs"
                        data-testid={`rollback-button-${version.version}`}
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
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {version.notes}
                    </p>
                  )}

                  {version.is_published && version.published_at && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Publié le{' '}
                      {format(new Date(version.published_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
