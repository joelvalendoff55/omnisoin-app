import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shortcut {
  key: string;
  description: string;
}

interface MedecinKeyboardShortcutsProps {
  className?: string;
}

const MEDECIN_SHORTCUTS: Shortcut[] = [
  { key: 'F', description: 'Focus' },
  { key: 'H', description: 'Historique' },
  { key: 'O', description: 'Ordonnance' },
  { key: 'D', description: 'Dictaphone' },
  { key: 'C', description: 'Courrier' },
  { key: 'Entrée', description: 'Valider' },
];

export function MedecinKeyboardShortcuts({ className }: MedecinKeyboardShortcutsProps) {
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
        {MEDECIN_SHORTCUTS.map((shortcut) => (
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
