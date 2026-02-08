import { Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FocusModeToggleProps {
  isFocusMode: boolean;
  onToggle: () => void;
}

export function FocusModeToggle({ isFocusMode, onToggle }: FocusModeToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isFocusMode ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className={cn(
              "gap-2 transition-all duration-300",
              isFocusMode && "bg-primary text-primary-foreground shadow-lg"
            )}
          >
            <Focus className="h-4 w-4" />
            <span className="hidden sm:inline">Focus</span>
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-background/20 rounded">
              F
            </kbd>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mode Focus - masque les éléments non essentiels</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
