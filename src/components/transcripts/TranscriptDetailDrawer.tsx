"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PatientTranscript,
  getAudioSignedUrl,
  updateTranscriptStatus,
  updateTranscriptLanguage,
  validateTranscript,
  revokeTranscriptValidation,
} from '@/lib/transcripts';
import { RevokeValidationDialog } from '@/components/transcripts/RevokeValidationDialog';
import {
  fetchSummaryByTranscriptId,
  createSummaryRequest,
  isWebhookConfigured,
  isSummaryStuck,
  getMinutesSinceStart,
  TranscriptSummary,
} from '@/lib/summaries';
import { useSummaryRealtime } from '@/hooks/useSummaryRealtime';
import { useRole } from '@/hooks/useRole';
import { RoleRestrictedAction } from '@/components/shared/RoleRestrictedAction';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Mic,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  FileText,
  Download,
  Globe,
  Sparkles,
  Copy,
  RefreshCw,
  Info,
  Clock,
  FileWarning,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from "next/navigation";
import {
  detectLanguage,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  DetectedLanguage,
} from '@/lib/languageDetection';
import { exportTranscriptToPdf } from '@/lib/transcriptsPdf';
import { NonValideBadge, DraftBadge } from '@/components/shared/DraftBadge';
import { LegalBanner } from '@/components/shared/LegalBanner';

interface TranscriptDetailDrawerProps {
  transcript: PatientTranscript | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
> = {
  uploaded: {
    label: 'À transcrire',
    variant: 'secondary',
    icon: <Mic className="h-3 w-3" />,
  },
  transcribing: {
    label: 'En cours',
    variant: 'default',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  ready: {
    label: 'Prêt',
    variant: 'outline',
    icon: <CheckCircle className="h-3 w-3 text-green-600" />,
  },
  failed: {
    label: 'Échec',
    variant: 'destructive',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const sourceLabels: Record<string, string> = {
  mic: 'Microphone',
  upload: 'Upload',
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
};

export function TranscriptDetailDrawer({
  transcript,
  open,
  onOpenChange,
  onRefresh,
}: TranscriptDetailDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const { isAdmin, isCoordinator, isPractitioner } = useRole();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [languageUpdating, setLanguageUpdating] = useState(false);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<TranscriptSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revocationLoading, setRevocationLoading] = useState(false);

  // Realtime subscription for summary updates
  const handleSummaryUpdate = useCallback((updatedSummary: TranscriptSummary) => {
    setSummary(updatedSummary);
    if (updatedSummary.status === 'ready') {
      toast.success('Résumé IA généré !');
    } else if (updatedSummary.status === 'failed') {
      toast.error('Échec de la génération du résumé');
    }
  }, []);

  useSummaryRealtime({
    transcriptId: transcript?.id || null,
    onUpdate: handleSummaryUpdate,
  });

  // Load summary when transcript changes
  useEffect(() => {
    const loadSummary = async () => {
      if (transcript?.id && transcript.status === 'ready') {
        setSummaryLoading(true);
        const existingSummary = await fetchSummaryByTranscriptId(transcript.id);
        setSummary(existingSummary);
        setSummaryLoading(false);
      } else {
        setSummary(null);
      }
    };

    if (open && transcript) {
      loadSummary();
    }
  }, [open, transcript?.id, transcript?.status]);

  // Auto-detect language when transcript becomes ready and language is null
  useEffect(() => {
    const autoDetectLanguage = async () => {
      if (
        transcript &&
        transcript.status === 'ready' &&
        transcript.transcript_text &&
        !transcript.language &&
        !hasAutoDetected &&
        user &&
        structureId
      ) {
        setHasAutoDetected(true);
        const detected = detectLanguage(transcript.transcript_text);
        if (detected !== 'unknown') {
          try {
            await updateTranscriptLanguage(
              transcript.id,
              detected,
              structureId,
              user.id,
              transcript.patient_id,
              null
            );
            onRefresh?.();
          } catch (error) {
            // Silently fail - RLS might block
            console.warn('Auto-detect language failed:', error);
          }
        }
      }
    };

    if (open && transcript) {
      autoDetectLanguage();
    }
  }, [open, transcript, user, structureId, hasAutoDetected, onRefresh]);

  // Reset auto-detect flag when transcript changes
  useEffect(() => {
    setHasAutoDetected(false);
  }, [transcript?.id]);

  useEffect(() => {
    const loadAudio = async () => {
      if (transcript?.audio_path) {
        setLoadingAudio(true);
        const url = await getAudioSignedUrl(transcript.audio_path);
        setAudioUrl(url);
        setLoadingAudio(false);
      } else {
        setAudioUrl(null);
      }
    };

    if (open && transcript) {
      loadAudio();
    }
  }, [open, transcript]);

  if (!transcript) return null;

  const config = statusConfig[transcript.status] || statusConfig.uploaded;
  const patientName = transcript.patient
    ? `${transcript.patient.first_name} ${transcript.patient.last_name}`
    : 'Patient inconnu';

  const canEditLanguage = isAdmin || isCoordinator;
  const currentLanguage = (transcript.language as DetectedLanguage) || 'unknown';

  const handleRequestTranscription = async () => {
    if (!user || !structureId) return;

    setActionLoading(true);
    try {
      await updateTranscriptStatus(
        transcript.id,
        'transcribing',
        structureId,
        user.id,
        transcript.patient_id
      );
      toast.success('Transcription lancée');
      onRefresh?.();
    } catch (error) {
      console.error('Error requesting transcription:', error);
      toast.error('Erreur lors du lancement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!user || !structureId) return;

    setActionLoading(true);
    try {
      await updateTranscriptStatus(
        transcript.id,
        'ready',
        structureId,
        user.id,
        transcript.patient_id,
        '[Transcription de test - Bonjour, je suis le patient Martin Dupont. Je viens pour une consultation de suivi. Le médecin m\'a prescrit un traitement pour ma tension artérielle. Je prends mes médicaments tous les jours comme indiqué. Merci beaucoup docteur.]'
      );
      toast.success('Transcription marquée comme prête');
      onRefresh?.();
    } catch (error) {
      console.error('Error marking ready:', error);
      toast.error('Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    if (!user || !structureId) return;

    setLanguageUpdating(true);
    try {
      await updateTranscriptLanguage(
        transcript.id,
        newLanguage,
        structureId,
        user.id,
        transcript.patient_id,
        transcript.language
      );
      toast.success('Langue mise à jour');
      onRefresh?.();
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLanguageUpdating(false);
    }
  };

  const handleExportPdf = () => {
    try {
      exportTranscriptToPdf(transcript);
      toast.success('PDF téléchargé');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  const handleGoToPatient = () => {
    onOpenChange(false);
    navigate(`/patients/${transcript.patient_id}`);
  };

  const handleGenerateSummary = async () => {
    if (!user || !structureId || !transcript.transcript_text) return;

    setGeneratingSummary(true);
    
    // Optimistic UI: show generating state immediately
    setSummary({
      id: 'temp-optimistic',
      transcript_id: transcript.id,
      structure_id: structureId,
      patient_id: transcript.patient_id,
      generated_by: user.id,
      summary_text: null,
      model_used: null,
      status: 'generating',
      error_message: null,
      error_details: null,
      started_at: new Date().toISOString(),
      latency_ms: null,
      created_at: new Date().toISOString(),
    });

    try {
      // This call is now SYNCHRONOUS - waits for n8n to complete
      const finalSummary = await createSummaryRequest(
        transcript.id,
        structureId,
        transcript.patient_id,
        user.id
      );
      
      // Update with the real summary from DB
      setSummary(finalSummary);
      
      if (finalSummary.status === 'ready') {
        toast.success('Résumé IA généré !');
      } else if (finalSummary.status === 'failed') {
        toast.error(finalSummary.error_message || 'Échec de la génération');
      }
      
      // Refresh parent data
      onRefresh?.();
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Erreur lors de la génération');
      // Reset to null so user can retry
      setSummary(null);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summary?.summary_text) return;

    try {
      await navigator.clipboard.writeText(summary.summary_text);
      toast.success('Résumé copié !');
    } catch (error) {
      console.error('Error copying summary:', error);
      toast.error('Erreur lors de la copie');
    }
  };

  const handleRetrySummary = async () => {
    // Reset state and retry - the upsert will update the existing record
    await handleGenerateSummary();
  };

  const handleValidateTranscript = async () => {
    if (!user || !structureId) return;

    setValidationLoading(true);
    try {
      const result = await validateTranscript(
        transcript.id,
        structureId,
        user.id,
        transcript.patient_id
      );
      if (result.success) {
        toast.success('Transcription validée médicalement');
        onRefresh?.();
      } else {
        toast.error(result.error || 'Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Error validating transcript:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidationLoading(false);
    }
  };

  const handleRevokeValidation = async (reason: string) => {
    if (!user || !structureId) return;

    setRevocationLoading(true);
    try {
      const result = await revokeTranscriptValidation(
        transcript.id,
        structureId,
        user.id,
        transcript.patient_id,
        reason,
        transcript.validated_by
      );
      if (result.success) {
        toast.success('Validation révoquée avec succès');
        setRevokeDialogOpen(false);
        onRefresh?.();
      } else {
        toast.error(result.error || 'Erreur lors de la révocation');
      }
    } catch (error) {
      console.error('Error revoking validation:', error);
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevocationLoading(false);
    }
  };

  const isValidated = !!transcript.validated_at;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Détail transcription
              </DrawerTitle>
              <div className="flex items-center gap-2">
                {isValidated ? (
                  <DraftBadge status="validated" />
                ) : (
                  <NonValideBadge />
                )}
                <Badge variant={config.variant} className="gap-1">
                  {config.icon}
                  {config.label}
                </Badge>
              </div>
            </div>
            <DrawerDescription>
              {format(new Date(transcript.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            {/* Legal disclaimer */}
            <LegalBanner variant="warning" compact>
              Note interne de transcription. Document non validé médicalement.
            </LegalBanner>
            {/* Patient info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{patientName}</p>
                      {transcript.patient?.phone && (
                        <p className="text-sm text-muted-foreground">
                          {transcript.patient.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleGoToPatient}>
                    Voir patient
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Metadata: Source, Language, Duration */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Source:</span>
                <Badge variant="outline">{sourceLabels[transcript.source] || transcript.source}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {canEditLanguage ? (
                  <Select
                    value={currentLanguage}
                    onValueChange={handleLanguageChange}
                    disabled={languageUpdating}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGE_LABELS[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">
                    {LANGUAGE_LABELS[currentLanguage] || currentLanguage}
                  </Badge>
                )}
              </div>

              {transcript.duration_seconds && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Durée:</span>
                  <span>{Math.floor(transcript.duration_seconds / 60)}:{String(transcript.duration_seconds % 60).padStart(2, '0')}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Audio player */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Audio</p>
              {loadingAudio ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : audioUrl ? (
                <audio controls className="w-full" src={audioUrl}>
                  Votre navigateur ne supporte pas l'audio.
                </audio>
              ) : (
                <p className="text-sm text-muted-foreground">Audio non disponible</p>
              )}
            </div>

            <Separator />

            {/* Transcript text */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Transcription</p>
              {transcript.status === 'ready' && transcript.transcript_text ? (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-wrap">{transcript.transcript_text}</p>
                  </CardContent>
                </Card>
              ) : transcript.status === 'transcribing' ? (
                <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Transcription en cours...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Le traitement est effectué par le serveur. Vous serez notifié lorsque la transcription sera prête.
                  </p>
                </div>
              ) : transcript.status === 'failed' ? (
                <p className="text-sm text-destructive">La transcription a échoué.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Demander transcription" pour envoyer au serveur.
                </p>
              )}
            </div>

            {/* AI Summary Section - Only show when transcript is ready */}
            {transcript.status === 'ready' && transcript.transcript_text && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Résumé IA</p>
                  </div>

                  {summaryLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </div>
                  ) : !summary ? (
                    <div className="space-y-2">
                      {isWebhookConfigured() ? (
                        <Button
                          onClick={handleGenerateSummary}
                          disabled={generatingSummary}
                          className="gap-2"
                          variant="outline"
                        >
                          <Sparkles className="h-4 w-4" />
                          {generatingSummary ? 'Lancement...' : 'Générer résumé'}
                        </Button>
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-lg border border-dashed flex items-start gap-2">
                          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            La génération de résumés IA n'est pas configurée. Contactez l'administrateur pour activer cette fonctionnalité.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : summary.status === 'pending' || summary.status === 'generating' ? (
                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed space-y-3">
                      {/* Status badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="font-medium">
                            {summary.status === 'pending' ? 'En attente...' : 'Génération en cours...'}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          {summary.status === 'pending' ? 'Pending' : 'Generating'}
                        </Badge>
                      </div>
                      
                      {/* Anti-stuck warning */}
                      {isSummaryStuck(summary) ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              ⏳ Toujours en cours depuis {getMinutesSinceStart(summary)} min...
                            </span>
                          </div>
                          <p className="text-sm text-amber-600 mb-2">
                            La génération semble bloquée. Vous pouvez relancer le processus.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRetrySummary}
                            disabled={generatingSummary}
                            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Relancer
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Le résumé est en cours de génération par l'IA. Cette opération peut prendre quelques secondes.
                        </p>
                      )}
                    </div>
                  ) : summary.status === 'ready' && summary.summary_text ? (
                    <div className="space-y-3">
                      {/* Status badge + metadata */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          ✓ Ready
                        </Badge>
                        {summary.model_used && (
                          <Badge variant="secondary" className="text-xs">
                            {summary.model_used}
                          </Badge>
                        )}
                        {summary.latency_ms && (
                          <span className="text-xs text-muted-foreground">
                            {(summary.latency_ms / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm whitespace-pre-wrap">{summary.summary_text}</p>
                        </CardContent>
                      </Card>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopySummary}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copier résumé
                      </Button>
                      <p className="text-xs text-muted-foreground italic">
                        Ce résumé est généré automatiquement par IA à des fins de documentation. 
                        Il ne constitue pas un avis médical et doit être vérifié par un professionnel de santé.
                      </p>
                    </div>
                  ) : summary.status === 'failed' ? (
                    <div className="space-y-2">
                      {/* Failed status badge */}
                      <Badge variant="destructive">Failed</Badge>
                      
                      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Échec de la génération</span>
                        </div>
                        {summary.error_message && (
                          <p className="text-sm text-destructive">
                            {summary.error_message}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetrySummary}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Réessayer
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {transcript.status === 'uploaded' && (
                <Button
                  onClick={handleRequestTranscription}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {actionLoading ? 'En cours...' : 'Demander transcription'}
                </Button>
              )}

              {/* Export PDF button - only when ready */}
              {transcript.status === 'ready' && transcript.transcript_text && (
                <Button
                  variant="outline"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter PDF
                </Button>
              )}

              {/* Medical validation button - practitioners only */}
              {transcript.status === 'ready' && !isValidated && (
                <RoleRestrictedAction
                  allowedRoles={['practitioner', 'admin']}
                  blockedMessage="Validation réservée aux praticiens"
                  hideIfNotAllowed={false}
                >
                  <Button
                    variant="default"
                    onClick={handleValidateTranscript}
                    disabled={validationLoading}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {validationLoading ? 'Validation...' : 'Valider médicalement'}
                  </Button>
                </RoleRestrictedAction>
              )}

              {/* Validated info + revoke button */}
              {isValidated && transcript.validated_at && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        Validé le {format(new Date(transcript.validated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <RoleRestrictedAction
                      allowedRoles={['practitioner', 'admin']}
                      blockedMessage="Révocation réservée aux praticiens"
                      hideIfNotAllowed
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeDialogOpen(true)}
                        className="gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                      >
                        <ShieldX className="h-4 w-4" />
                        Révoquer
                      </Button>
                    </RoleRestrictedAction>
                  </div>
                </div>
              )}

              {/* Admin dev tool */}
              {isAdmin && transcript.status === 'transcribing' && (
                <Button
                  variant="outline"
                  onClick={handleMarkReady}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {actionLoading ? 'En cours...' : 'Marquer prêt (dev)'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>

      {/* Revoke Validation Dialog */}
      <RevokeValidationDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        onConfirm={handleRevokeValidation}
        loading={revocationLoading}
      />
    </Drawer>
  );
}
