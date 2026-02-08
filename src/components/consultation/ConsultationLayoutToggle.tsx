import { LayoutGrid, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ConsultationLayoutMode = 'simplified' | 'full';

interface ConsultationLayoutToggleProps {
  mode: ConsultationLayoutMode;
  onChange: (mode: ConsultationLayoutMode) => void;
  disabled?: boolean;
  className?: string;
}

export function ConsultationLayoutToggle({
  mode,
  onChange,
  disabled = false,
  className,
}: ConsultationLayoutToggleProps) {
  return (
    <TooltipProvider>
      <div className={cn("flex items-center border rounded-lg p-0.5 bg-muted/30", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'simplified' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onChange('simplified')}
              disabled={disabled}
              className="h-7 px-2.5 gap-1.5"
            >
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Simplifié</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Mode simplifié - 3 colonnes</p>
            <p className="text-xs text-muted-foreground">Raccourci: S</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'full' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onChange('full')}
              disabled={disabled}
              className="h-7 px-2.5 gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Complet</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Mode complet - Cockpit</p>
            <p className="text-xs text-muted-foreground">Raccourci: G</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
