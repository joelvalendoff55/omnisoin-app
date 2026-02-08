"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface PatientViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function PatientViewToggle({ viewMode, onViewModeChange }: PatientViewToggleProps) {
  // Keyboard shortcut V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v' && 
          !e.ctrlKey && !e.metaKey && !e.altKey &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)) {
        onViewModeChange(viewMode === 'grid' ? 'list' : 'grid');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, onViewModeChange]);

  return (
    <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className={cn(
          "h-8 px-3 gap-1.5 rounded-md transition-all",
          viewMode === 'grid' 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Grille</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('list')}
        className={cn(
          "h-8 px-3 gap-1.5 rounded-md transition-all",
          viewMode === 'list' 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Liste</span>
      </Button>
    </div>
  );
}
