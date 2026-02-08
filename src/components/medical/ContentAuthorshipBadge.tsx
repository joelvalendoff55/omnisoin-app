import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  User, 
  History, 
  Clock, 
  Sparkles,
  Edit3,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useContentAuthorship, AuthorshipEntry, EntityType, SourceType } from '@/hooks/useContentAuthorship';

export interface ContentAuthorshipBadgeProps {
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  className?: string;
  showHistory?: boolean;
  compact?: boolean;
  /** Override source type (for new/unsaved entities) */
  localSourceType?: SourceType;
}

const SOURCE_CONFIG: Record<SourceType, {
  icon: typeof Bot;
  label: string;
  labelShort: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
}> = {
  ai_generated: {
    icon: Bot,
    label: 'Généré par IA',
    labelShort: 'IA',
    variant: 'secondary',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  },
  human_created: {
    icon: User,
    label: 'Créé par',
    labelShort: 'Humain',
    variant: 'outline',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
  },
  human_modified: {
    icon: Edit3,
    label: 'Modifié par',
    labelShort: 'Modifié',
    variant: 'outline',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  },
  ai_assisted: {
    icon: Sparkles,
    label: 'Assisté par IA, validé par',
    labelShort: 'IA+Humain',
    variant: 'secondary',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  },
};

export function ContentAuthorshipBadge({
  entityType,
  entityId,
  fieldName,
  className,
  showHistory = true,
  compact = false,
  localSourceType,
}: ContentAuthorshipBadgeProps) {
  const [latestEntry, setLatestEntry] = useState<AuthorshipEntry | null>(null);
  const [history, setHistory] = useState<AuthorshipEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { getLatestAuthorship, getAuthorshipHistory, loading } = useContentAuthorship();

  // For new entities or when localSourceType is provided, use that instead of DB lookup
  const isNewEntity = entityId === 'new' || !!localSourceType;

  useEffect(() => {
    const loadAuthorship = async () => {
      if (isNewEntity) return; // Don't fetch for new entities
      const latest = await getLatestAuthorship(entityType, entityId, fieldName);
      setLatestEntry(latest);
    };
    loadAuthorship();
  }, [entityType, entityId, fieldName, getLatestAuthorship, isNewEntity]);

  const loadHistory = async () => {
    if (!showHistory || isNewEntity) return;
    const entries = await getAuthorshipHistory(entityType, entityId, fieldName);
    setHistory(entries);
  };

  // Use local source type for new entities
  const effectiveSourceType: SourceType = localSourceType || latestEntry?.source_type || 'human_created';
  
  // For new entities, create a minimal display entry
  const displayEntry = isNewEntity ? null : latestEntry;

  // If no source type at all, don't show
  if (!localSourceType && !latestEntry) {
    return null;
  }

  const config = SOURCE_CONFIG[effectiveSourceType];
  const Icon = config.icon;

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const renderBadgeContent = () => {
    if (compact || isNewEntity) {
      return (
        <Badge variant={config.variant} className={cn('gap-1 text-xs font-medium', config.className, className)}>
          <Icon className="h-3 w-3" />
          {config.labelShort}
        </Badge>
      );
    }

    const actorDisplay = displayEntry 
      ? (effectiveSourceType === 'ai_generated'
        ? displayEntry.ai_model || 'IA'
        : displayEntry.actor_name || 'Utilisateur')
      : '';

    return (
      <Badge variant={config.variant} className={cn('gap-1.5 text-xs font-medium py-1 px-2', config.className, className)}>
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="truncate max-w-[150px]">
          {config.label} {actorDisplay}
        </span>
        {displayEntry?.ai_confidence && effectiveSourceType === 'ai_generated' && (
          <span className="text-[10px] opacity-75">
            ({Math.round(displayEntry.ai_confidence * 100)}%)
          </span>
        )}
      </Badge>
    );
  };

  // For new entities or if history is disabled, just show the badge
  if (isNewEntity || !showHistory) {
    return renderBadgeContent();
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) loadHistory();
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <div className="flex items-center gap-1">
            {renderBadgeContent()}
            {showHistory && (
              <History className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Historique des modifications</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {history.length} version{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
          </p>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-2">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Chargement...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Aucun historique disponible
              </div>
            ) : (
              history.map((entry, index) => {
                const entryConfig = SOURCE_CONFIG[entry.source_type];
                const EntryIcon = entryConfig.icon;
                const isLatest = index === 0;

                return (
                  <div 
                    key={entry.id} 
                    className={cn(
                      'p-2 rounded-lg border',
                      isLatest ? 'bg-muted/50 border-primary/20' : 'bg-background'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'p-1 rounded',
                        entryConfig.className
                      )}>
                        <EntryIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium truncate">
                            {entry.source_type === 'ai_generated' 
                              ? entry.ai_model || 'IA' 
                              : entry.actor_name || 'Utilisateur'}
                          </span>
                          {isLatest && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              Actuel
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>v{entry.version_number}</span>
                          <ChevronRight className="h-2 w-2" />
                          <span>{formatTimestamp(entry.created_at)}</span>
                        </div>
                        {entry.ai_confidence && entry.source_type === 'ai_generated' && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Confiance: {Math.round(entry.ai_confidence * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
