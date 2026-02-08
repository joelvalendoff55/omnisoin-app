import { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Phone, AlertTriangle, Activity, CalendarCheck, ListTodo, BarChart3, FileText, Stethoscope } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CockpitHeader } from '@/components/dashboard/CockpitHeader';
import { CockpitZone } from '@/components/dashboard/CockpitZone';
import { AssistantTasksWidget } from '@/components/assistant/AssistantTasksWidget';
import { PatientConsultationBanner } from '@/components/patient/PatientConsultationBanner';
import { PatientSelector } from '@/components/patient/PatientSelector';
import { VitalSignsSectionSafe } from '@/components/vitals/VitalSignsSection';
import { PatientAntecedentsSummary } from '@/components/medical/PatientAntecedentsSummary';
import { UrgentAlertBanner } from '@/components/assistant/UrgentAlertBanner';
import { FloatingActionButton } from '@/components/assistant/FloatingActionButton';
import { KeyboardShortcutsHelp } from '@/components/assistant/KeyboardShortcutsHelp';
import { DraggableQueueList } from '@/components/assistant/DraggableQueueList';
import { AssistantUpcomingAppointments } from '@/components/assistant/AssistantUpcomingAppointments';
import { AverageWaitTimeCard } from '@/components/assistant/AverageWaitTimeCard';
import { EnhancedStatsWidget } from '@/components/assistant/EnhancedStatsWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssistantDashboard } from '@/hooks/useAssistantDashboard';
import { usePatientConsultationContext } from '@/hooks/usePatientConsultationContext';
import { usePatientQueue } from '@/hooks/usePatientQueue';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';

export default function AssistantDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    queueToday,
    tasksAssigned,
    callbackItems,
    stats,
    urgentNotifications,
    loading,
    refresh,
  } = useAssistantDashboard();

  const { callEntry } = usePatientQueue();
  const { structureId } = useStructureId();

  // Patient context for vital signs
  const { context: patientContext } = usePatientConsultationContext();

  // State for manually ordered queue (for drag & drop)
  const [orderedQueue, setOrderedQueue] = useState<typeof queueToday>([]);

  // Process queue items with waiting time - sorted by priority then arrival (or manual order)
  const waitingPatients = useMemo(() => {
    const baseList = orderedQueue.length > 0 ? orderedQueue : (queueToday || []);
    return baseList
      .filter(e => e.status === 'waiting' || e.status === 'called')
      .map(e => {
        const waitingMinutes = e.arrival_time 
          ? Math.floor((Date.now() - new Date(e.arrival_time).getTime()) / 60000)
          : 0;
        return {
          ...e,
          waitingMinutes,
          statusLevel: waitingMinutes > 30 ? 'urgent' as const : waitingMinutes > 15 ? 'attention' as const : 'ok' as const,
        };
      })
      // Sort: manual_order first if exists, then priority, then arrival time
      .sort((a, b) => {
        // If both have manual_order, use that
        if ((a as any).manual_order != null && (b as any).manual_order != null) {
          return (a as any).manual_order - (b as any).manual_order;
        }
        // Otherwise use priority + arrival
        const priorityDiff = (a.priority || 3) - (b.priority || 3);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.arrival_time || 0).getTime() - new Date(b.arrival_time || 0).getTime();
      });
  }, [queueToday, orderedQueue]);

  // Sync orderedQueue when queueToday changes
  useEffect(() => {
    setOrderedQueue([]);
  }, [queueToday]);

  // Handle drag & drop reorder
  const handleReorder = useCallback((reorderedEntries: any[]) => {
    // Update local state immediately for optimistic UI
    const fullQueue = (queueToday || []).map(entry => {
      const reorderedIndex = reorderedEntries.findIndex(e => e.id === entry.id);
      if (reorderedIndex !== -1) {
        return { ...entry, manual_order: reorderedIndex + 1 };
      }
      return entry;
    });
    setOrderedQueue(fullQueue as typeof queueToday);
  }, [queueToday]);

  // Patients currently in consultation
  const patientsInConsultation = useMemo(() => {
    return (queueToday || []).filter(e => e.status === 'in_consultation');
  }, [queueToday]);

  // Get callback messages
  const callbackMessages = useMemo(() => {
    return (callbackItems || []).slice(0, 3);
  }, [callbackItems]);

  // Build urgent alerts
  const urgentAlerts = useMemo(() => {
    const alerts: { type: 'urgent' | 'warning'; message: string }[] = [];
    
    // Check for urgent priority patients waiting
    const urgentPatients = waitingPatients.filter(p => p.priority === 1);
    if (urgentPatients.length > 0) {
      alerts.push({
        type: 'urgent',
        message: `${urgentPatients.length} patient${urgentPatients.length > 1 ? 's' : ''} urgent${urgentPatients.length > 1 ? 's' : ''} en attente`,
      });
    }

    // Check for patients waiting > 30 min
    const longWaitPatients = waitingPatients.filter(p => p.waitingMinutes > 30);
    if (longWaitPatients.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${longWaitPatients.length} patient${longWaitPatients.length > 1 ? 's' : ''} attendent depuis +30 min`,
      });
    }

    return alerts;
  }, [waitingPatients]);

  // Keyboard shortcut: Space to call next patient
  const handleCallNextPatient = useCallback(async () => {
    const nextPatient = waitingPatients.find(p => p.status === 'waiting');
    if (nextPatient) {
      try {
        await callEntry(nextPatient.id);
        toast.success(`${nextPatient.patient?.first_name} ${nextPatient.patient?.last_name} appelé(e)`);
        refresh();
      } catch (error) {
        toast.error("Erreur lors de l'appel du patient");
      }
    } else {
      toast.info("Aucun patient en attente");
    }
  }, [waitingPatients, callEntry, refresh]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleCallNextPatient();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCallNextPatient]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  const urgentCount = waitingPatients.filter(p => p.priority === 1).length;
  const pendingTasks = tasksAssigned?.filter(t => t.status !== 'done') || [];

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-20">
        {/* Urgent Alert Banner */}
        <UrgentAlertBanner alerts={urgentAlerts} />

        {/* Patient Context Banner */}
        <PatientConsultationBanner />
        <PatientSelector />

        {/* Header */}
        <CockpitHeader 
          onRefresh={refresh} 
          loading={loading}
          notificationCount={urgentNotifications?.length || 0}
        />

        {/* 3 ZONES LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          
          {/* ZONE CRITIQUE - File d'attente (left, 5 cols) */}
          <div className="xl:col-span-5">
            <CockpitZone
              title="File d'attente"
              count={waitingPatients.length}
              variant="critical"
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              action={{
                label: 'Gérer',
                onClick: () => navigate('/file-attente'),
              }}
            >
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : waitingPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun patient en attente</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-1">
                  <DraggableQueueList
                    entries={waitingPatients}
                    structureId={structureId || ''}
                    onReorder={handleReorder}
                    onItemClick={(entryId) => navigate(`/file-attente?entry=${entryId}`)}
                  />
                </div>
              )}
            </CockpitZone>
          </div>

          {/* ZONE TRAVAIL - Patient en cours + Tâches (center, 4 cols) */}
          <div className="xl:col-span-4 space-y-4">
            {/* Patient en cours */}
            <CockpitZone
              title="En consultation"
              count={patientsInConsultation.length}
              variant="work"
              icon={<Activity className="h-4 w-4 text-primary" />}
            >
              {patientsInConsultation.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun patient en consultation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {patientsInConsultation.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30 cursor-pointer hover:bg-primary/15 transition-colors"
                      onClick={() => navigate(`/file-attente?entry=${entry.id}`)}
                    >
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {entry.patient?.first_name} {entry.patient?.last_name}
                        </p>
                        {entry.reason && (
                          <p className="text-xs text-muted-foreground">{entry.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CockpitZone>

            {/* Tâches assignées */}
            <CockpitZone
              title="Mes tâches"
              count={pendingTasks.length}
              variant="work"
              icon={<ListTodo className="h-4 w-4 text-primary" />}
              action={{
                label: 'Voir tout',
                onClick: () => navigate('/tasks'),
              }}
            >
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : pendingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune tâche en attente
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pendingTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/tasks?task=${task.id}`)}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority <= 2 ? 'bg-destructive' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-sm truncate flex-1">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </CockpitZone>

            {/* Rappels à faire */}
            <CockpitZone 
              title="Rappels à faire" 
              count={callbackMessages.length}
              variant="work"
              icon={<Phone className="h-4 w-4 text-primary" />}
            >
              {callbackMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun rappel en attente
                </p>
              ) : (
                <div className="space-y-2">
                  {callbackMessages.map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inbox')}
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{(item as any).sender_name || 'Patient'}</p>
                        <p className="text-xs text-muted-foreground truncate">{(item as any).subject || 'Rappeler'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CockpitZone>
          </div>

          {/* ZONE INFO - Stats + Prochains RDV (right, 3 cols) */}
          <div className="xl:col-span-3 space-y-4">
            {/* Stats du jour */}
            <CockpitZone
              title="Stats du jour"
              variant="info"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="space-y-3">
                {/* Average Wait Time - Featured */}
                <AverageWaitTimeCard waitingPatients={waitingPatients} />
                
                {/* Enhanced stats grid */}
                <EnhancedStatsWidget stats={stats} loading={loading} />
              </div>
            </CockpitZone>

            {/* Prochains RDV du jour */}
            <CockpitZone
              title="Prochains RDV"
              variant="info"
              icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
              action={{
                label: 'Agenda',
                onClick: () => navigate('/agenda'),
              }}
            >
              <AssistantUpcomingAppointments />
            </CockpitZone>

            {/* Urgent Alerts from notifications */}
            {urgentNotifications && urgentNotifications.length > 0 && (
              <CockpitZone 
                title="Alertes système" 
                count={urgentNotifications.length}
                priority
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              >
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {urgentNotifications.slice(0, 3).map((notif, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-xs">{notif.message || notif.title}</p>
                    </div>
                  ))}
                </div>
              </CockpitZone>
            )}
          </div>
        </div>

        {/* Patient Context: Antecedents Summary + Vital Signs */}
        {patientContext.patient && (
          <div className="grid gap-4 lg:grid-cols-2">
            <PatientAntecedentsSummary patientId={patientContext.patient.id} />
            <VitalSignsSectionSafe 
              patientId={patientContext.patient.id} 
              structureId={patientContext.patient.structure_id} 
            />
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp />
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </DashboardLayout>
  );
}
