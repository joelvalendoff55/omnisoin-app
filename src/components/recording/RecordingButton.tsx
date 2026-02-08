import { useAutoRecording } from '@/hooks/useAutoRecording';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingButtonProps {
  patientId: string;
  patientName: string;
  queueEntryId?: string;
  consultationId?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export function RecordingButton({
  patientId,
  patientName,
  queueEntryId,
  consultationId,
  size = 'default',
  className,
}: RecordingButtonProps) {
  const { isRecording, currentSession, startRecording, stopRecording } = useAutoRecording();
  
  const isRecordingThisPatient = isRecording && currentSession?.patientId === patientId;

  const handleClick = async () => {
    if (isRecordingThisPatient) {
      await stopRecording();
    } else {
      await startRecording(patientId, patientName, queueEntryId, consultationId);
    }
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant={isRecordingThisPatient ? 'destructive' : 'outline'}
      className={cn(
        'gap-2',
        isRecordingThisPatient && 'animate-pulse',
        className
      )}
    >
      {isRecordingThisPatient ? (
        <>
          <Square className="h-4 w-4" />
          Arrêter
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          Enregistrer
        </>
      )}
    </Button>
  );
}
