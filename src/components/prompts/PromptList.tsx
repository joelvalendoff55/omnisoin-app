import { SystemPrompt, getCategoryLabel, getCategoryColor } from '@/lib/prompts';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FileText, Check } from 'lucide-react';

interface PromptListProps {
  prompts: SystemPrompt[];
  selectedPromptId: string | null;
  publishedVersions: Record<string, boolean>;
  onSelect: (prompt: SystemPrompt) => void;
  categoryFilter: string | null;
  onCategoryFilter: (category: string | null) => void;
}

const categories = ['assistant', 'summary', 'transcription', 'analysis', 'other'];

export function PromptList({
  prompts,
  selectedPromptId,
  publishedVersions,
  onSelect,
  categoryFilter,
  onCategoryFilter,
}: PromptListProps) {
  const filteredPrompts = categoryFilter
    ? prompts.filter((p) => p.category === categoryFilter)
    : prompts;

  return (
    <div className="flex flex-col h-full" data-testid="prompt-list">
      {/* Category filters */}
      <div className="p-3 border-b flex flex-wrap gap-1.5" data-testid="category-filters">
        <Badge
          variant={categoryFilter === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onCategoryFilter(null)}
          data-testid="filter-all"
        >
          Tous
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onCategoryFilter(cat)}
            data-testid={`filter-${cat}`}
          >
            {getCategoryLabel(cat)}
          </Badge>
        ))}
      </div>

      {/* Prompt list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Aucun prompt trouvé
            </p>
          ) : (
            filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => onSelect(prompt)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  'hover:bg-accent',
                  selectedPromptId === prompt.id && 'bg-accent'
                )}
                data-testid={`prompt-item-${prompt.name}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {prompt.display_name}
                      </span>
                      {publishedVersions[prompt.id] && (
                        <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', getCategoryColor(prompt.category))}
                      >
                        {getCategoryLabel(prompt.category)}
                      </Badge>
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {prompt.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
