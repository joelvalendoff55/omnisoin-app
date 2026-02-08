import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Patient } from '@/types/patient';
import { uploadTranscriptAudio, createTranscript } from '@/lib/transcripts';
import { Upload, Search, Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TranscriptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structureId: string;
  userId: string;
  preselectedPatientId?: string;
  onSuccess?: () => void;
}

export function TranscriptUploadDialog({
  open,
  onOpenChange,
  structureId,
  userId,
  preselectedPatientId,
  onSuccess,
}: TranscriptUploadDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [mode, setMode] = useState<'upload' | 'record'>('upload');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('is_archived', false)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setPatients(data as Patient[]);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadPatients();
      if (preselectedPatientId) {
        setSelectedPatientId(preselectedPatientId);
      }
    } else {
      // Reset state when closed
      resetState();
    }
  }, [open, preselectedPatientId, loadPatients]);

  // Cleanup audio preview URL on unmount or when blob changes
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const resetState = () => {
    setSearchTerm('');
    setSelectedPatientId(null);
    setSelectedFile(null);
    setMode('upload');
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordedBlob(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
    setIsPlaying(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = p.phone?.toLowerCase() || '';
    return fullName.includes(term) || phone.includes(term);
  });

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
      if (!validTypes.some((type) => file.type.includes(type.split('/')[1]))) {
        toast.error('Format audio non supporté. Utilisez MP3, WAV, OGG, WEBM ou M4A.');
        return;
      }
      // Check file size (50MB max)
      if (file.size > 52428800) {
        toast.error('Fichier trop volumineux. Maximum 50MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use webm format, fallback to default
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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mimeType || 'audio/webm' 
        });
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast.success('Enregistrement démarré');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      toast.success('Enregistrement terminé');
    }
  };

  const clearRecording = () => {
    setRecordedBlob(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (audioPreviewRef.current) {
      if (isPlaying) {
        audioPreviewRef.current.pause();
      } else {
        audioPreviewRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }

    let fileToUpload: File | null = null;
    let source: 'upload' | 'mic' = 'upload';

    if (mode === 'upload') {
      if (!selectedFile) {
        toast.error('Veuillez sélectionner un fichier audio');
        return;
      }
      fileToUpload = selectedFile;
      source = 'upload';
    } else {
      if (!recordedBlob) {
        toast.error('Veuillez enregistrer un audio');
        return;
      }
      // Convert blob to file
      const extension = recordedBlob.type.includes('webm') ? 'webm' : 'ogg';
      fileToUpload = new File([recordedBlob], `recording.${extension}`, {
        type: recordedBlob.type,
      });
      source = 'mic';
    }

    setLoading(true);
    try {
      // Upload audio file
      const audioPath = await uploadTranscriptAudio(fileToUpload, structureId);

      // Create transcript record with duration for recordings
      const duration = mode === 'record' ? recordingDuration : undefined;
      await createTranscript(structureId, selectedPatientId, audioPath, userId, source, duration);

      toast.success('Audio uploadé avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error uploading transcript:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = selectedPatientId && (
    (mode === 'upload' && selectedFile) || 
    (mode === 'record' && recordedBlob)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Nouvelle transcription
          </DialogTitle>
          <DialogDescription>
            Uploadez ou enregistrez un audio pour transcription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient selection */}
          <div className="space-y-2">
            <Label>Patient</Label>
            {preselectedPatientId && selectedPatient ? (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </p>
                {selectedPatient.phone && (
                  <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un patient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {loadingPatients ? (
                    <p className="p-3 text-sm text-muted-foreground">Chargement...</p>
                  ) : filteredPatients.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Aucun patient trouvé</p>
                  ) : (
                    filteredPatients.slice(0, 10).map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className={`w-full p-3 text-left hover:bg-muted transition-colors ${
                          selectedPatientId === patient.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedPatientId(patient.id)}
                      >
                        <p className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </p>
                        {patient.phone && (
                          <p className="text-sm text-muted-foreground">{patient.phone}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mode tabs: Upload or Record */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'upload' | 'record')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="record" className="gap-2">
                <Mic className="h-4 w-4" />
                Enregistrer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-2 mt-4">
              <Label>Fichier audio</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </TabsContent>

            <TabsContent value="record" className="space-y-4 mt-4">
              {/* Recording controls */}
              <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/30">
                {/* Timer */}
                <div className="text-4xl font-mono font-semibold">
                  {formatDuration(recordingDuration)}
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="flex items-center gap-2 text-destructive">
                    <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                    <span className="text-sm font-medium">Enregistrement en cours...</span>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {!isRecording && !recordedBlob && (
                    <Button
                      type="button"
                      onClick={startRecording}
                      variant="default"
                      size="lg"
                      className="gap-2"
                    >
                      <Mic className="h-5 w-5" />
                      Démarrer
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                      className="gap-2"
                    >
                      <Square className="h-5 w-5" />
                      Arrêter
                    </Button>
                  )}

                  {recordedBlob && !isRecording && (
                    <>
                      <Button
                        type="button"
                        onClick={togglePlayback}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-5 w-5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5" />
                            Écouter
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={clearRecording}
                        variant="ghost"
                        size="lg"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-5 w-5" />
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>

                {/* Hidden audio element for preview playback */}
                {audioPreviewUrl && (
                  <audio
                    ref={audioPreviewRef}
                    src={audioPreviewUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                )}

                {/* Recording status */}
                {recordedBlob && (
                  <p className="text-sm text-muted-foreground">
                    Enregistrement prêt ({(recordedBlob.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {loading ? 'Upload en cours...' : 'Uploader'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
