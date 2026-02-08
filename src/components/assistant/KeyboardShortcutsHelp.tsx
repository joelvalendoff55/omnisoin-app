import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shortcut {
  key: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts?: Shortcut[];
  className?: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { key: 'N', description: 'Nouveau patient' },
  { key: 'R', description: 'Nouveau RDV' },
  { key: 'T', description: 'Transcription' },
  { key: 'Espace', description: 'Appeler prochain' },
];

export function KeyboardShortcutsHelp({ shortcuts = DEFAULT_SHORTCUTS, className }: KeyboardShortcutsHelpProps) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-6 py-2 px-4 rounded-lg bg-muted/50 border border-border",
      className
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Keyboard className="h-4 w-4" />
        <span className="text-xs font-medium">Raccourcis</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 text-[10px] font-mono font-medium bg-background border border-border rounded shadow-sm">
              {shortcut.key}
            </kbd>
            <span className="text-xs text-muted-foreground">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
