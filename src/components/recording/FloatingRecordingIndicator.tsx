"use client";

import { useState, useContext } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Mic, Square, User, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import context directly to avoid throwing error
import { AutoRecordingContext } from '@/hooks/useAutoRecording';

export function FloatingRecordingIndicator() {
  const context = useContext(AutoRecordingContext);
  const [isOpen, setIsOpen] = useState(false);

  // Safely handle case when provider is not available or not recording
  if (!context || !context.isRecording) {
    return null;
  }

  const { isRecording, currentSession, duration, stopRecording, cancelRecording } = context;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleStop = async () => {
    await stopRecording();
    setIsOpen(false);
  };

  const handleCancel = () => {
    cancelRecording();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg",
              "bg-destructive hover:bg-destructive/90",
              "animate-pulse"
            )}
          >
            <Mic className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          className="w-72"
          sideOffset={8}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="font-semibold text-destructive">Enregistrement en cours</span>
            </div>

            {/* Patient info */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{currentSession?.patientName}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-mono font-bold">{formatDuration(duration)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleStop}
                variant="default"
                className="flex-1 gap-2"
              >
                <Square className="h-4 w-4" />
                Arrêter & Sauvegarder
              </Button>
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
