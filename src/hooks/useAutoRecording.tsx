"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { uploadTranscriptAudio, createTranscript } from '@/lib/transcripts';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { useRole } from '@/hooks/useRole';

interface RecordingSession {
  patientId: string;
  patientName: string;
  queueEntryId?: string;
  consultationId?: string;
  startedAt: Date;
}

interface AutoRecordingContextValue {
  isRecording: boolean;
  currentSession: RecordingSession | null;
  duration: number;
  startRecording: (patientId: string, patientName: string, queueEntryId?: string, consultationId?: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
}

export const AutoRecordingContext = createContext<AutoRecordingContextValue | null>(null);

export function AutoRecordingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const { isPractitioner, isCoordinator, isAssistant } = useRole();
  
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getRecorderType = useCallback((): 'assistant' | 'doctor' | 'coordinator' | 'manual' => {
    if (isPractitioner) return 'doctor';
    if (isCoordinator) return 'coordinator';
    if (isAssistant) return 'assistant';
    return 'manual';
  }, [isPractitioner, isCoordinator, isAssistant]);

  const startRecording = useCallback(async (
    patientId: string,
    patientName: string,
    queueEntryId?: string,
    consultationId?: string
  ) => {
    if (isRecording) {
      // Already recording - stop current and start new
      await stopRecording();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Determine MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      
      setIsRecording(true);
      setDuration(0);
      setCurrentSession({
        patientId,
        patientName,
        queueEntryId,
        consultationId,
        startedAt: new Date(),
      });

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      toast.success('Enregistrement démarré', {
        description: `Patient: ${patientName}`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Impossible d'accéder au microphone", {
        description: "Vérifiez les permissions du navigateur",
      });
    }
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !currentSession || !user || !structureId) {
      return;
    }

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      const session = currentSession;
      const recordedDuration = duration;

      mediaRecorder.onstop = async () => {
        try {
          // Create blob from chunks
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Convert to file
          const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          const file = new File([audioBlob], `auto-recording-${Date.now()}.${extension}`, {
            type: mimeType,
          });

          // Upload audio
          const audioPath = await uploadTranscriptAudio(file, structureId);

          // Create transcript record with additional metadata
          const recorderType = getRecorderType();
          
          // Use raw insert to include new fields
          const { error } = await supabase
            .from('patient_transcripts')
            .insert({
              structure_id: structureId,
              patient_id: session.patientId,
              audio_path: audioPath,
              source: 'mic',
              status: 'uploaded',
              created_by: user.id,
              duration_seconds: recordedDuration,
              consultation_id: session.consultationId || null,
              queue_entry_id: session.queueEntryId || null,
              recorder_type: recorderType,
            });

          if (error) throw error;

          toast.success('Enregistrement sauvegardé', {
            description: `${formatDuration(recordedDuration)} - ${session.patientName}`,
          });
        } catch (error) {
          console.error('Error saving recording:', error);
          toast.error("Erreur lors de la sauvegarde de l'enregistrement");
        } finally {
          // Cleanup
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          
          setIsRecording(false);
          setCurrentSession(null);
          setDuration(0);
          audioChunksRef.current = [];
          resolve();
        }
      };

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else {
        resolve();
      }
    });
  }, [currentSession, duration, user, structureId, getRecorderType]);

  const cancelRecording = useCallback(() => {
    // Stop without saving
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setCurrentSession(null);
    setDuration(0);
    audioChunksRef.current = [];
    
    toast.info('Enregistrement annulé');
  }, []);

  return (
    <AutoRecordingContext.Provider
      value={{
        isRecording,
        currentSession,
        duration,
        startRecording,
        stopRecording,
        cancelRecording,
      }}
    >
      {children}
    </AutoRecordingContext.Provider>
  );
}

export function useAutoRecording() {
  const context = useContext(AutoRecordingContext);
  if (!context) {
    throw new Error('useAutoRecording must be used within AutoRecordingProvider');
  }
  return context;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
