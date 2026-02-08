"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { useTranscriptsRealtime } from '@/hooks/useTranscriptsRealtime';
import { useActionPermission } from '@/hooks/useActionPermission';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { HealthDataGuard } from '@/components/shared/HealthDataGuard';
import { TranscriptUploadDialog } from '@/components/transcripts/TranscriptUploadDialog';
import { TranscriptDetailDrawer } from '@/components/transcripts/TranscriptDetailDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PatientTranscript,
  TranscriptFilters,
  TranscriptStatus,
  fetchTranscripts,
  fetchTranscriptById,
} from '@/lib/transcripts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Mic,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Download,
  FileWarning,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportTranscriptsListToPdf } from '@/lib/transcriptsPdf';
import { SensitivePageBanner } from '@/components/shared/LegalBanner';
import { NonValideBadge } from '@/components/shared/DraftBadge';

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

export default function TranscriptsPage() {
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transcripts, setTranscripts] = useState<PatientTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TranscriptFilters>({
    status: 'all',
    patientSearch: '',
  });
  const [selectedTranscript, setSelectedTranscript] = useState<PatientTranscript | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const loadTranscripts = useCallback(async () => {
    if (!structureId) return;

    setLoading(true);
    try {
      const data = await fetchTranscripts({
        status: filters.status as TranscriptStatus | 'all',
      });
      setTranscripts(data);
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId, filters.status]);

  // Realtime subscription
  useTranscriptsRealtime({
    structureId,
    enabled: true,
    onRefresh: loadTranscripts,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (structureId) {
      loadTranscripts();
    }
  }, [structureId, loadTranscripts]);

  // Handle openTranscript query param from GlobalSearch
  useEffect(() => {
    const openTranscriptId = searchParams.get('openTranscript');
    if (openTranscriptId && !loading && transcripts.length > 0) {
      // Try to find in loaded transcripts first
      const found = transcripts.find((t) => t.id === openTranscriptId);
      if (found) {
        setSelectedTranscript(found);
        setDrawerOpen(true);
      } else {
        // Fetch directly if not in list
        fetchTranscriptById(openTranscriptId).then((transcript) => {
          if (transcript) {
            setSelectedTranscript(transcript);
            setDrawerOpen(true);
          }
        });
      }
      // Clean URL
      setSearchParams((params) => {
        params.delete('openTranscript');
        return params;
      }, { replace: true });
    }
  }, [searchParams, loading, transcripts, setSearchParams]);

  // Client-side patient search filter
  const filteredTranscripts = transcripts.filter((t) => {
    if (!filters.patientSearch) return true;
    const term = filters.patientSearch.toLowerCase();
    const patientName = t.patient
      ? `${t.patient.first_name} ${t.patient.last_name}`.toLowerCase()
      : '';
    const patientPhone = t.patient?.phone?.toLowerCase() || '';
    return patientName.includes(term) || patientPhone.includes(term);
  });

  // Count by status
  const statusCounts = {
    all: transcripts.length,
    uploaded: transcripts.filter((t) => t.status === 'uploaded').length,
    ready: transcripts.filter((t) => t.status === 'ready').length,
    failed: transcripts.filter((t) => t.status === 'failed').length,
  };

  const handleTranscriptClick = (transcript: PatientTranscript) => {
    setSelectedTranscript(transcript);
    setDrawerOpen(true);
  };

  const isLoading = authLoading || roleLoading || structureLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  if (!structureId) {
    return <NoAccessPage />;
  }

  return (
    <DashboardLayout>
      <HealthDataGuard resource="transcripts" action="read">
      <div className="space-y-6">
        {/* Legal Banner */}
        <SensitivePageBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transcriptions</h1>
              <p className="text-muted-foreground mt-1">
                Gestion des transcriptions audio
              </p>
            </div>
            <NonValideBadge className="shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            {filteredTranscripts.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    exportTranscriptsListToPdf(filteredTranscripts);
                    toast.success('PDF téléchargé');
                  } catch (error) {
                    console.error('Export error:', error);
                    toast.error("Erreur lors de l'export");
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter PDF
              </Button>
            )}
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4" data-testid="transcripts-filters">
          <Tabs
            value={filters.status || 'all'}
            onValueChange={(value) => setFilters((f) => ({ ...f, status: value as TranscriptStatus | 'all' }))}
          >
            <TabsList>
              <TabsTrigger value="all" data-testid="transcripts-filter-all">
                Tous
                {statusCounts.all > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {statusCounts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="uploaded" data-testid="transcripts-filter-uploaded">
                À transcrire
                {statusCounts.uploaded > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {statusCounts.uploaded}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ready" data-testid="transcripts-filter-ready">
                Prêts
                {statusCounts.ready > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {statusCounts.ready}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="failed" data-testid="transcripts-filter-failed">
                Échecs
                {statusCounts.failed > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {statusCounts.failed}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher patient..."
              value={filters.patientSearch}
              onChange={(e) => setFilters((f) => ({ ...f, patientSearch: e.target.value }))}
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTranscripts.length === 0 ? (
          <Card data-testid="transcripts-empty">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                Aucune transcription trouvée
              </p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Ajouter une transcription
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredTranscripts.map((transcript) => {
              const config = statusConfig[transcript.status] || statusConfig.uploaded;
              const patientName = transcript.patient
                ? `${transcript.patient.first_name} ${transcript.patient.last_name}`
                : 'Patient inconnu';

              return (
                <Card
                  key={transcript.id}
                  data-testid="transcript-card"
                  data-status={transcript.status}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleTranscriptClick(transcript)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="p-2 bg-muted rounded-full shrink-0">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{patientName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(transcript.created_at), 'dd/MM/yyyy HH:mm', {
                              locale: fr,
                            })}
                          </span>
                          {transcript.duration_seconds && (
                            <>
                              <span>•</span>
                              <span>
                                {Math.floor(transcript.duration_seconds / 60)}:
                                {String(transcript.duration_seconds % 60).padStart(2, '0')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge variant={config.variant} className="gap-1 shrink-0">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </HealthDataGuard>

      {/* Upload dialog */}
      <TranscriptUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        structureId={structureId}
        userId={user.id}
        onSuccess={loadTranscripts}
      />

      {/* Detail drawer */}
      <TranscriptDetailDrawer
        transcript={selectedTranscript}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRefresh={loadTranscripts}
      />
    </DashboardLayout>
  );
}
