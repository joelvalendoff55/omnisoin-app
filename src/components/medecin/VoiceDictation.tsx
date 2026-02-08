import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// Check for Web Speech API support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function VoiceDictation({ onTranscript, disabled = false, className }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        onTranscript(final.trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Accès au microphone refusé', {
          description: 'Veuillez autoriser l\'accès au microphone dans les paramètres du navigateur',
        });
      } else if (event.error !== 'aborted') {
        toast.error('Erreur de reconnaissance vocale');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      // Only set to false if we're still recording (not manually stopped)
      if (isRecording) {
        // Restart recognition if it ended unexpectedly
        try {
          recognition.start();
        } catch (e) {
          setIsRecording(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [onTranscript, isRecording]);

  const handleToggle = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript('');
      toast.info('Dictée arrêtée');
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.success('Dictée vocale activée', {
          description: 'Parlez clairement en français',
        });
      } catch (e) {
        console.error('Error starting recognition:', e);
        toast.error('Impossible de démarrer la dictée');
      }
    }
  }, [isRecording]);

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled
              className={className}
            >
              <MicOff className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Dictée vocale non supportée par ce navigateur</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={handleToggle}
              disabled={disabled}
              className={cn(
                "relative transition-all duration-200",
                isRecording && "animate-pulse"
              )}
            >
              {isRecording ? (
                <>
                  <Mic className="h-4 w-4" />
                  {/* Pulsing ring indicator */}
                  <span className="absolute inset-0 rounded-md animate-ping bg-destructive/30" />
                </>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isRecording ? 'Arrêter la dictée' : 'Démarrer la dictée vocale'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Recording indicator with interim text */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
          <span className="text-destructive font-medium">Enregistrement...</span>
          {interimTranscript && (
            <span className="text-muted-foreground italic max-w-[200px] truncate">
              {interimTranscript}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
