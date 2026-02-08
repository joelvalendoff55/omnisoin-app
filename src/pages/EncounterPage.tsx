import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, AlertCircle, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEncounter } from '@/hooks/useEncounter';
import { 
  EpisodeStatusBadge, 
  EpisodeModeToggle, 
  EpisodeTimeline,
  EncounterClinicalContent,
  EncounterPatientContext
} from '@/components/encounter';
import { getWaitingTime } from '@/lib/queue';
import type { EncounterStatus } from '@/types/encounter';

export default function EncounterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    encounter, 
    loading, 
    error, 
    statusHistory,
    updateStatus,
    updateMode 
  } = useEncounter(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Épisode non trouvé</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const waitingTime = encounter.queue_entry?.arrival_time 
    ? getWaitingTime(encounter.queue_entry.arrival_time)
    : null;

  const canChangeMode = ['created', 'preconsult_in_progress'].includes(encounter.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                Hub Épisode
              </h1>
              {encounter.patient && (
                <p className="text-sm text-muted-foreground">
                  {encounter.patient.first_name} {encounter.patient.last_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <EpisodeStatusBadge status={encounter.status} size="lg" />
            <EpisodeModeToggle
              mode={encounter.mode}
              onModeChange={updateMode}
              disabled={!canChangeMode}
            />
          </div>
        </div>
      </header>

      {/* Main Content - 3 Columns */}
      <main className="container px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
          {/* Column 1: Timeline */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chronologie</CardTitle>
              </CardHeader>
              <CardContent>
                <EpisodeTimeline
                  history={statusHistory}
                  currentStatus={encounter.status}
                  startedAt={encounter.started_at}
                  className="max-h-[400px]"
                />
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(encounter.started_at), "d MMMM yyyy", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Démarré à {format(new Date(encounter.started_at), "HH:mm", { locale: fr })}
                  </span>
                </div>
                {waitingTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Attente: {waitingTime.formatted}</span>
                  </div>
                )}
                {encounter.queue_entry?.reason && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Motif</p>
                    <p className="text-sm">{encounter.queue_entry.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Clinical Content */}
          <div className="min-h-[600px]">
            <EncounterClinicalContent
              encounter={encounter}
              onStatusChange={updateStatus}
            />
          </div>

          {/* Column 3: Patient Context */}
          <EncounterPatientContext encounter={encounter} />
        </div>
      </main>
    </div>
  );
}
