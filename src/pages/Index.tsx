import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CockpitZone } from '@/components/dashboard/CockpitZone';
import { PatientQueueItem } from '@/components/dashboard/PatientQueueItem';
import DraggableKPIGrid from '@/components/dashboard/DraggableKPIGrid';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import TodayAppointmentsList from '@/components/dashboard/TodayAppointmentsList';
import DashboardAlertsWidget, { DashboardAlert } from '@/components/dashboard/DashboardAlertsWidget';
import { CriticalLabAlertsWidget } from '@/components/dashboard/CriticalLabAlertsWidget';
import EnhancedQuickActions from '@/components/dashboard/EnhancedQuickActions';
import { EnhancedDashboardHeader } from '@/components/dashboard/EnhancedDashboardHeader';
import { RecentPatientsWidget } from '@/components/dashboard/RecentPatientsWidget';
import { UrgentTasksWidget } from '@/components/dashboard/UrgentTasksWidget';
import { MiniCalendarWidget } from '@/components/dashboard/MiniCalendarWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMSPDashboard } from '@/hooks/useMSPDashboard';
import { usePatientQueue } from '@/hooks/usePatientQueue';
import { useAppointments } from '@/hooks/useAppointments';
import { format } from 'date-fns';

const Index = () => {
  const { user, loading } = useAuth();
  const { isPractitioner, isAssistant, isCoordinator } = useRole();
  const navigate = useNavigate();
  const { todayStats, weeklyActivity, loading: dashboardLoading, refresh } = useMSPDashboard();
  const { entries: queueEntries, loading: queueLoading } = usePatientQueue();
  const { appointments, loading: appointmentsLoading } = useAppointments({ viewMode: 'day' });

  // Filter today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (appointments || [])
      .filter(apt => {
        const aptDate = new Date(apt.start_time);
        return aptDate >= today && aptDate < tomorrow && apt.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [appointments]);

  // Filter waiting patients with status
  const waitingPatients = useMemo(() => {
    return queueEntries
      .filter(e => e.status === 'waiting' || e.status === 'called')
      .map(e => {
        const waitingMinutes = e.arrival_time 
          ? Math.floor((Date.now() - new Date(e.arrival_time).getTime()) / 60000)
          : 0;
        return {
          ...e,
          waitingMinutes,
          status: waitingMinutes > 30 ? 'urgent' as const : waitingMinutes > 15 ? 'attention' as const : 'ok' as const,
        };
      })
      .sort((a, b) => (b.priority || 3) - (a.priority || 3) || (a.waitingMinutes || 0) - (b.waitingMinutes || 0));
  }, [queueEntries]);

  // Generate alerts from current data
  const alerts = useMemo<DashboardAlert[]>(() => {
    const alertsList: DashboardAlert[] = [];

    // Long wait time alerts
    waitingPatients
      .filter((p) => p.waitingMinutes > 30)
      .forEach((p) => {
        alertsList.push({
          id: `wait-${p.id}`,
          type: 'urgent',
          category: 'wait_time',
          title: 'Attente prolongée',
          description: `${p.waitingMinutes} min d'attente`,
          timestamp: new Date(p.arrival_time || Date.now()),
          patientId: p.patient_id,
          patientName: p.patient ? `${p.patient.first_name} ${p.patient.last_name}` : undefined,
          actionLabel: 'Voir file',
          actionHref: '/file-attente',
        });
      });

    // Cancelled appointments today
    const cancelledToday = (appointments || []).filter(
      (apt) => apt.status === 'cancelled' && 
      new Date(apt.start_time).toDateString() === new Date().toDateString()
    );
    
    cancelledToday.forEach((apt) => {
      alertsList.push({
        id: `cancel-${apt.id}`,
        type: 'warning',
        category: 'cancellation',
        title: 'RDV annulé',
        description: `${format(new Date(apt.start_time), 'HH:mm')} - ${apt.title}`,
        timestamp: new Date(apt.updated_at || apt.start_time),
        patientId: apt.patient_id || undefined,
        patientName: apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : undefined,
        actionLabel: 'Voir agenda',
        actionHref: '/agenda',
      });
    });

    // No-shows
    const noShows = queueEntries.filter(
      (e) => e.status === 'no_show' && 
      new Date(e.created_at).toDateString() === new Date().toDateString()
    );
    
    noShows.forEach((e) => {
      alertsList.push({
        id: `noshow-${e.id}`,
        type: 'warning',
        category: 'no_show',
        title: 'Patient absent',
        description: 'Non présenté au rendez-vous',
        timestamp: new Date(e.updated_at || e.created_at),
        patientId: e.patient_id,
        patientName: e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : undefined,
      });
    });

    return alertsList;
  }, [waitingPatients, appointments, queueEntries]);

  // Dismiss alert (just removes from view, could persist in localStorage)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedAlerts.has(a.id)),
    [alerts, dismissedAlerts]
  );

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with Search and Shortcuts */}
        <EnhancedDashboardHeader
          onRefresh={refresh}
          loading={dashboardLoading}
          urgentCount={visibleAlerts.filter((a) => a.type === 'urgent').length}
        />

        {/* KPI Widgets with Drag & Drop */}
        {dashboardLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <DraggableKPIGrid
            stats={todayStats}
            loading={dashboardLoading}
            onNavigate={navigate}
          />
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Charts + Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interactive Charts */}
            <DashboardCharts
              weeklyActivity={weeklyActivity}
              appointments={todayAppointments}
              loading={dashboardLoading}
            />

            {/* Waiting Queue */}
            <CockpitZone
              title="Patients en attente"
              count={waitingPatients.length}
              priority={waitingPatients.length > 0}
              icon={<Clock className="h-4 w-4 text-warning" />}
              action={{
                label: 'Voir file',
                onClick: () => navigate('/file-attente'),
              }}
            >
              {queueLoading ? (
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
                <div className="space-y-2">
                  {waitingPatients.slice(0, 5).map((entry) => (
                    <PatientQueueItem
                      key={entry.id}
                      patientName={`${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`}
                      arrivalTime={entry.arrival_time || undefined}
                      reason={entry.reason || entry.consultation_reason?.label}
                      waitingMinutes={entry.waitingMinutes}
                      status={entry.status}
                      onClick={() => navigate('/file-attente')}
                    />
                  ))}
                  {waitingPatients.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      + {waitingPatients.length - 5} autres patients
                    </p>
                  )}
                </div>
              )}
            </CockpitZone>
          </div>

          {/* Right Column: Appointments, Recent Patients, Alerts, Quick Actions */}
          <div className="space-y-6">
            {/* Mini Calendar */}
            <MiniCalendarWidget />

            {/* Today's Appointments */}
            <TodayAppointmentsList
              appointments={todayAppointments}
              loading={appointmentsLoading}
            />

            {/* Recent Patients Widget */}
            <RecentPatientsWidget />

            {/* Urgent Tasks Widget */}
            <UrgentTasksWidget />

            {/* Critical Lab Results Alerts */}
            <CriticalLabAlertsWidget />

            {/* Alerts & Notifications */}
            <DashboardAlertsWidget
              alerts={visibleAlerts}
              loading={dashboardLoading}
              onDismiss={handleDismissAlert}
            />

            {/* Quick Actions */}
            <EnhancedQuickActions />
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note :</strong> Ce logiciel est non réglementaire,
              non dispositif médical, non aide au diagnostic et non aide à la prescription.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
