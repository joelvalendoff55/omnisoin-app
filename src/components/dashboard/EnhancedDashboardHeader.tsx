"use client";

import { useEffect, useState } from 'react';
import { RefreshCw, Keyboard, Command, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import GlobalSearch from '@/components/search/GlobalSearch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EnhancedDashboardHeaderProps {
  onRefresh: () => void;
  loading?: boolean;
  urgentCount?: number;
}

interface KeyboardShortcut {
  keys: string[];
  description: string;
  action: string;
}

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ['⌘', 'K'], description: 'Recherche globale', action: 'search' },
  { keys: ['N'], description: 'Nouveau patient', action: '/patients?action=new' },
  { keys: ['A'], description: 'Agenda', action: '/agenda' },
  { keys: ['F'], description: 'File d\'attente', action: '/file-attente' },
  { keys: ['P'], description: 'Patients', action: '/patients' },
  { keys: ['R'], description: 'Actualiser', action: 'refresh' },
];

export function EnhancedDashboardHeader({
  onRefresh,
  loading,
  urgentCount,
}: EnhancedDashboardHeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for shortcuts (without modifiers except Cmd/Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // GlobalSearch handles its own Cmd+K
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            window.location.href = '/patients?action=new';
            break;
          case 'a':
            e.preventDefault();
            window.location.href = '/agenda';
            break;
          case 'f':
            e.preventDefault();
            window.location.href = '/file-attente';
            break;
          case 'p':
            e.preventDefault();
            window.location.href = '/patients';
            break;
          case 'r':
            e.preventDefault();
            onRefresh();
            break;
          case '?':
            e.preventDefault();
            setShowShortcuts((prev) => !prev);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRefresh]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Title and Date */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
            {urgentCount !== undefined && urgentCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      {/* Right: Search and Actions */}
      <div className="flex items-center gap-2">
        {/* Global Search */}
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>

        {/* Mobile Search Button */}
        <Button variant="outline" size="icon" className="sm:hidden">
          <Search className="h-4 w-4" />
        </Button>

        {/* Keyboard Shortcuts */}
        <TooltipProvider>
          <Popover open={showShortcuts} onOpenChange={setShowShortcuts}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Raccourcis clavier (?)</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Command className="h-4 w-4" />
                  Raccourcis clavier
                </h4>
                <div className="grid gap-1">
                  {KEYBOARD_SHORTCUTS.map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="flex items-center justify-between py-1 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TooltipProvider>

        {/* Refresh Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualiser (R)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
