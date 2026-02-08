"use client";

import { User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  type EncounterMode, 
  ENCOUNTER_MODE_CONFIG 
} from '@/types/encounter';

interface EpisodeModeToggleProps {
  mode: EncounterMode;
  onModeChange: (mode: EncounterMode) => void;
  disabled?: boolean;
  className?: string;
}

export function EpisodeModeToggle({ 
  mode, 
  onModeChange, 
  disabled = false,
  className 
}: EpisodeModeToggleProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-lg', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'solo' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('solo')}
              disabled={disabled}
              className="gap-1.5"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Solo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{ENCOUNTER_MODE_CONFIG.solo.label}</p>
            <p className="text-xs text-muted-foreground">
              {ENCOUNTER_MODE_CONFIG.solo.description}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'assisted' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('assisted')}
              disabled={disabled}
              className="gap-1.5"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Assisté</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{ENCOUNTER_MODE_CONFIG.assisted.label}</p>
            <p className="text-xs text-muted-foreground">
              {ENCOUNTER_MODE_CONFIG.assisted.description}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
