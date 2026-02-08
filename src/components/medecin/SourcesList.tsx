import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Pill, BookOpen, Building2, Globe } from 'lucide-react';
import type { MedicalSource } from '@/hooks/useMedicalResearch';

interface SourcesListProps {
  sources: MedicalSource[];
  className?: string;
}

const SOURCE_CONFIG: Record<MedicalSource['type'], {
  label: string;
  icon: typeof FileText;
  colorClass: string;
}> = {
  has: {
    label: 'HAS',
    icon: FileText,
    colorClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  vidal: {
    label: 'Vidal',
    icon: Pill,
    colorClass: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30',
  },
  pubmed: {
    label: 'PubMed',
    icon: BookOpen,
    colorClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
  ansm: {
    label: 'ANSM',
    icon: Building2,
    colorClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  other: {
    label: 'Autre',
    icon: Globe,
    colorClass: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/30',
  },
};

export function SourcesList({ sources, className }: SourcesListProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Aucune source officielle trouvée
      </p>
    );
  }

  // Sort: official sources first
  const sortedSources = [...sources].sort((a, b) => {
    const priorityOrder = ['has', 'vidal', 'ansm', 'pubmed', 'other'];
    return priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type);
  });

  return (
    <div className={className}>
      <h4 className="text-sm font-medium mb-2">Sources ({sources.length})</h4>
      <div className="space-y-2">
        {sortedSources.map((source, idx) => {
          const config = SOURCE_CONFIG[source.type];
          const Icon = config.icon;
          
          return (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
            >
              <Badge variant="outline" className={`shrink-0 ${config.colorClass}`}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-sm truncate flex-1 text-muted-foreground">
                {source.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                asChild
              >
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
