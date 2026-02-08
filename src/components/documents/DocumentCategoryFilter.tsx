import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Image, FileType, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocumentCategory = 'ordonnance' | 'resultat' | 'certificat' | 'imagerie' | 'courrier' | 'autre';

interface DocumentCategoryFilterProps {
  selectedCategory: DocumentCategory | null;
  onCategoryChange: (category: DocumentCategory | null) => void;
  counts?: Record<DocumentCategory, number>;
}

const CATEGORIES: { id: DocumentCategory; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'ordonnance', label: 'Ordonnances', icon: FileText, color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
  { id: 'resultat', label: 'Résultats', icon: FileType, color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20' },
  { id: 'certificat', label: 'Certificats', icon: FileText, color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' },
  { id: 'imagerie', label: 'Imagerie', icon: Image, color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' },
  { id: 'courrier', label: 'Courriers', icon: FileText, color: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20' },
  { id: 'autre', label: 'Autres', icon: FileText, color: 'bg-muted text-muted-foreground hover:bg-muted/80' },
];

export function DocumentCategoryFilter({
  selectedCategory,
  onCategoryChange,
  counts = {} as Record<DocumentCategory, number>,
}: DocumentCategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedCategory && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onCategoryChange(null)}
        >
          <X className="h-3 w-3 mr-1" />
          Effacer
        </Button>
      )}
      {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
        const count = counts[id] || 0;
        const isActive = selectedCategory === id;
        
        return (
          <button
            key={id}
            onClick={() => onCategoryChange(isActive ? null : id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              'border',
              isActive ? `${color} border-current` : 'bg-background hover:bg-muted border-transparent'
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{label}</span>
            {count > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 text-[10px] px-1 ml-0.5">
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
