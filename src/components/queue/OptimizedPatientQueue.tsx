import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, UserCheck, Stethoscope, CheckCircle2, Bell, AlertTriangle, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { QueueEntry } from '@/lib/queue';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

// Workflow statuses for assistant → doctor flow
export type WorkflowStatus = 'en_attente' | 'en_preparation' | 'pret_consultation' | 'en_consultation' | 'termine';

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: typeof Clock;
}> = {
  en_attente: { 
    label: 'En attente', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted',
    icon: Clock 
  },
  en_preparation: { 
    label: 'En préparation', 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    icon: UserCheck 
  },
  pret_consultation: { 
    label: 'Prêt', 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    icon: Bell 
  },
  en_consultation: { 
    label: 'En consultation', 
    color: 'text-primary', 
    bgColor: 'bg-primary/10',
    icon: Stethoscope 
  },
  termine: { 
    label: 'Terminé', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted/50',
    icon: CheckCircle2 
  },
};

// Map existing statuses to workflow statuses
export function mapToWorkflowStatus(status: string): WorkflowStatus {
  switch (status) {
    case 'present':
    case 'waiting':
      return 'en_attente';
    case 'called':
      return 'en_preparation';
    case 'in_consultation':
      return 'en_consultation';
    case 'completed':
    case 'closed':
      return 'termine';
    default:
      return 'en_attente';
  }
}

// Check if patient has ready_at set (marked as ready by assistant)
export function isPatientReady(entry: QueueEntry): boolean {
  return !!entry.ready_at && entry.status !== 'in_consultation' && entry.status !== 'completed';
}

interface OptimizedPatientQueueProps {
  entries: QueueEntry[];
  onMarkReady: (entryId: string) => Promise<void>;
  onStartConsultation: (entryId: string) => Promise<void>;
  onComplete: (entryId: string) => Promise<void>;
  onSelectPatient: (entry: QueueEntry) => void;
  isDoctor?: boolean;
  loading?: boolean;
}

function getWaitingMinutes(arrivalTime: string): number {
  const arrival = new Date(arrivalTime);
  const now = new Date();
  return Math.floor((now.getTime() - arrival.getTime()) / 60000);
}

function getWaitTimeColor(minutes: number): string {
  if (minutes < 15) return 'text-success';
  if (minutes < 30) return 'text-warning';
  return 'text-destructive';
}

export function OptimizedPatientQueue({
  entries,
  onMarkReady,
  onStartConsultation,
  onComplete,
  onSelectPatient,
  isDoctor = false,
  loading = false,
}: OptimizedPatientQueueProps) {
  const navigate = useNavigate();
  const { structureId } = useStructureId();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [encounterLoading, setEncounterLoading] = useState<string | null>(null);
  const [, setRefreshTick] = useState(0);

  // Update waiting times every minute
  useEffect(() => {
    const interval = setInterval(() => setRefreshTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (entryId: string, action: () => Promise<void>) => {
    setActionLoading(entryId);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEncounter = async (entry: QueueEntry, mode: 'solo' | 'assisted' = 'solo') => {
    if (!structureId || !entry.patient_id) {
      toast.error('Données manquantes');
      return;
    }

    setEncounterLoading(entry.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check for existing encounter today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: existingEncounters, error: searchError } = await supabase
        .from('encounters')
        .select('id, status')
        .eq('patient_id', entry.patient_id)
        .eq('structure_id', structureId)
        .gte('started_at', todayISO)
        .not('status', 'in', '("completed","cancelled")')
        .order('started_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;

      // If encounter exists, open it
      if (existingEncounters && existingEncounters.length > 0) {
        navigate(`/encounter/${existingEncounters[0].id}`);
        return;
      }

      // Create new encounter
      const initialStatus = mode === 'assisted' ? 'preconsult_in_progress' : 'consultation_in_progress';
      
      const { data: newEncounter, error: createError } = await supabase
        .from('encounters')
        .insert({
          patient_id: entry.patient_id,
          structure_id: structureId,
          mode,
          status: initialStatus,
          queue_entry_id: entry.id,
          assigned_practitioner_id: entry.assigned_to || null,
          created_by: userData.user.id,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      toast.success(`Épisode créé (${mode === 'solo' ? 'Solo' : 'Assisté'})`);
      navigate(`/encounter/${newEncounter.id}`);
    } catch (err) {
      console.error('Error opening/creating encounter:', err);
      toast.error('Impossible d\'ouvrir l\'épisode');
    } finally {
      setEncounterLoading(null);
    }
  };

  // Sort entries: ready patients first, then by priority, then by arrival
  const sortedEntries = [...entries].sort((a, b) => {
    const aReady = isPatientReady(a);
    const bReady = isPatientReady(b);
    
    // Ready patients first for doctors
    if (isDoctor && aReady !== bReady) return aReady ? -1 : 1;
    
    // In consultation first
    if (a.status === 'in_consultation' && b.status !== 'in_consultation') return -1;
    if (b.status === 'in_consultation' && a.status !== 'in_consultation') return 1;
    
    // Then by priority
    if ((a.priority || 3) !== (b.priority || 3)) {
      return (a.priority || 3) - (b.priority || 3);
    }
    
    // Then by arrival time
    return new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime();
  });

  const activeEntries = sortedEntries.filter(e => 
    !['completed', 'closed', 'cancelled', 'no_show'].includes(e.status || 'waiting')
  );

  const readyCount = activeEntries.filter(e => isPatientReady(e)).length;
  const inConsultationCount = activeEntries.filter(e => e.status === 'in_consultation').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isDoctor ? (
              <>
                <Stethoscope className="h-5 w-5 text-primary" />
                Patients prêts
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-primary" />
                File d'attente
              </>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {readyCount > 0 && (
              <Badge variant="default" className="bg-success text-success-foreground">
                {readyCount} prêt{readyCount > 1 ? 's' : ''}
              </Badge>
            )}
            {inConsultationCount > 0 && (
              <Badge variant="default" className="bg-primary">
                {inConsultationCount} en cours
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 p-4 pt-0">
            {activeEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun patient en attente
              </div>
            ) : (
              activeEntries.map(entry => {
                const waitingMinutes = entry.arrival_time ? getWaitingMinutes(entry.arrival_time) : 0;
                const patientReady = isPatientReady(entry);
                const workflowStatus = patientReady ? 'pret_consultation' : mapToWorkflowStatus(entry.status || 'waiting');
                const statusConfig = WORKFLOW_STATUS_CONFIG[workflowStatus];
                const StatusIcon = statusConfig.icon;
                const patientName = entry.patient 
                  ? `${entry.patient.first_name || ''} ${entry.patient.last_name || ''}`.trim() || 'Patient'
                  : 'Patient';
                const isLoading = actionLoading === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      "hover:shadow-md hover:border-primary/30",
                      patientReady && "border-success/50 bg-success/5 ring-1 ring-success/20",
                      entry.status === 'in_consultation' && "border-primary/50 bg-primary/5",
                      (entry.priority || 3) === 1 && "border-destructive/30"
                    )}
                    onClick={() => onSelectPatient(entry)}
                  >
                    {/* Status indicator */}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                      statusConfig.bgColor
                    )}>
                      <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                    </div>

                    {/* Patient info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{patientName}</span>
                        {(entry.priority || 3) === 1 && (
                          <Badge variant="destructive" className="h-5 text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                        {(entry.priority || 3) === 2 && (
                          <Badge variant="outline" className="h-5 text-[10px] border-warning text-warning">
                            Prioritaire
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className={cn("font-medium", getWaitTimeColor(waitingMinutes))}>
                          {waitingMinutes} min
                        </span>
                        {entry.reason && (
                          <>
                            <span>•</span>
                            <span className="truncate">{entry.reason}</span>
                          </>
                        )}
                        {entry.assistant_notes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="h-4 text-[9px]">Notes</Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{entry.assistant_notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] flex-shrink-0", statusConfig.color, statusConfig.bgColor)}
                    >
                      {statusConfig.label}
                    </Badge>

                    {/* Action buttons - 1 click */}
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {/* Bouton Ouvrir l'épisode */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 border-primary/30 hover:bg-primary/10"
                            onClick={() => handleOpenEncounter(entry, isDoctor ? 'solo' : 'assisted')}
                            disabled={encounterLoading === entry.id || loading}
                          >
                            <FolderOpen className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ouvrir l'épisode</TooltipContent>
                      </Tooltip>

                      {!isDoctor && entry.status === 'waiting' && !patientReady && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 bg-success/10 border-success/30 hover:bg-success/20"
                              onClick={() => handleAction(entry.id, () => onMarkReady(entry.id))}
                              disabled={isLoading || loading}
                            >
                              <Bell className="h-4 w-4 text-success" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Marquer prêt pour consultation</TooltipContent>
                        </Tooltip>
                      )}

                      {isDoctor && patientReady && entry.status !== 'in_consultation' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => handleAction(entry.id, () => onStartConsultation(entry.id))}
                              disabled={isLoading || loading}
                            >
                              <Stethoscope className="h-4 w-4 mr-1" />
                              Consulter
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Prendre en consultation</TooltipContent>
                        </Tooltip>
                      )}

                      {isDoctor && entry.status === 'in_consultation' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 border-success/30 hover:bg-success/10"
                              onClick={() => handleAction(entry.id, () => onComplete(entry.id))}
                              disabled={isLoading || loading}
                            >
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Terminer consultation</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
