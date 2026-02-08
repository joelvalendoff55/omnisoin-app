"use client";

import { useState, useEffect, useCallback } from 'react';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConsultationTimerProps {
  isActive: boolean;
  startTime?: string | null;
  className?: string;
}

export function ConsultationTimer({ isActive, startTime, className }: ConsultationTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  // Reset timer when patient changes
  useEffect(() => {
    if (startTime) {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
      setIsPaused(false);
      setPausedAt(null);
    } else {
      setElapsedSeconds(0);
    }
  }, [startTime]);

  // Update timer every second
  useEffect(() => {
    if (!isActive || isPaused || !startTime) return;

    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, startTime]);

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      // Resume - don't change elapsed, just continue counting
      setIsPaused(false);
    } else {
      // Pause
      setPausedAt(elapsedSeconds);
      setIsPaused(true);
    }
  }, [isPaused, elapsedSeconds]);

  const handleReset = useCallback(() => {
    setElapsedSeconds(0);
    setIsPaused(false);
    setPausedAt(null);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine color based on duration
  const getColorClass = () => {
    const minutes = elapsedSeconds / 60;
    if (minutes < 10) return 'text-green-600 dark:text-green-400';
    if (minutes < 20) return 'text-orange-500 dark:text-orange-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getBgClass = () => {
    const minutes = elapsedSeconds / 60;
    if (minutes < 10) return 'bg-green-500/10 border-green-500/20';
    if (minutes < 20) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-300",
      getBgClass(),
      className
    )}>
      <Clock className={cn("h-4 w-4", getColorClass())} />
      <span className={cn(
        "font-mono text-sm font-semibold tabular-nums",
        getColorClass(),
        isPaused && "animate-pulse"
      )}>
        {formatTime(isPaused && pausedAt !== null ? pausedAt : elapsedSeconds)}
      </span>
      
      <div className="flex items-center gap-1 ml-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handlePauseToggle}
              >
                {isPaused ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPaused ? 'Reprendre' : 'Pause'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Réinitialiser</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
