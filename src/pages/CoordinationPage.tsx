import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useACIIndicators } from '@/hooks/useACIIndicators';
import { useRCPMeetings } from '@/hooks/useRCPMeetings';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ACIIndicatorsSection } from '@/components/coordination/ACIIndicatorsSection';
import { RCPMeetingsSection } from '@/components/coordination/RCPMeetingsSection';
import { AlertsSection } from '@/components/coordination/AlertsSection';
import { SyncButtons } from '@/components/coordination/SyncButtons';
import { AlertTriangle } from 'lucide-react';

export default function CoordinationPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { indicators, loading: indicatorsLoading } = useACIIndicators();
  const { meetings, loading: meetingsLoading, createMeeting } = useRCPMeetings();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !isCoordinator) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Accès refusé</h2>
          <p className="text-muted-foreground">Cette page est réservée aux coordinateurs et administrateurs.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Espace Coordinatrice</h1>
            <p className="text-muted-foreground">Suivi des indicateurs ACI et coordination de l'équipe</p>
          </div>
          <SyncButtons />
        </div>

        {/* Alerts Section */}
        <AlertsSection indicators={indicators} loading={indicatorsLoading} />

        {/* ACI Indicators */}
        <ACIIndicatorsSection indicators={indicators} loading={indicatorsLoading} />

        {/* RCP Meetings */}
        <RCPMeetingsSection 
          meetings={meetings} 
          loading={meetingsLoading} 
          onCreateMeeting={createMeeting}
        />
      </div>
    </DashboardLayout>
  );
}
