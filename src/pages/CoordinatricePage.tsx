import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useACIIndicators } from '@/hooks/useACIIndicators';
import { useAssistantDashboard } from '@/hooks/useAssistantDashboard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ACIDashboardSection } from '@/components/coordination/ACIDashboardSection';
import { CPAMDossiersSection } from '@/components/coordination/CPAMDossiersSection';
import { TeamPlanningSection } from '@/components/coordination/TeamPlanningSection';
import { ReportsSection } from '@/components/coordination/ReportsSection';
import DocumentationSection from '@/components/coordination/DocumentationSection';
import WritingAssistantSection from '@/components/coordination/WritingAssistantSection';
import { AssistantStatsWidget } from '@/components/assistant/AssistantStatsWidget';
import { AssistantQueueWidget } from '@/components/assistant/AssistantQueueWidget';
import { AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function CoordinatricePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { indicators, loading: indicatorsLoading } = useACIIndicators();
  const { 
    queueToday, 
    stats, 
    loading: dashboardLoading, 
    refresh 
  } = useAssistantDashboard();

  // Compute waiting patients list
  const waitingPatients = useMemo(() => {
    return queueToday
      .filter(entry => entry.status === 'waiting' || entry.status === 'called')
      .sort((a, b) => (a.priority || 3) - (b.priority || 3));
  }, [queueToday]);

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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              Espace Coordinatrice MSP
            </h1>
            <p className="text-muted-foreground">
              Suivi des indicateurs ACI, gestion administrative et coordination de l'équipe
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={dashboardLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${dashboardLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Daily Stats */}
        <AssistantStatsWidget stats={stats} loading={dashboardLoading} />

        {/* Queue Overview */}
        <AssistantQueueWidget entries={waitingPatients} loading={dashboardLoading} />

        {/* Main Content with Tabs */}
        <Tabs defaultValue="aci" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="aci">Tableau de bord ACI</TabsTrigger>
            <TabsTrigger value="cpam">Gestion CPAM/ARS</TabsTrigger>
            <TabsTrigger value="planning">Planning équipe</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
            <TabsTrigger value="assistant">Assistant IA</TabsTrigger>
          </TabsList>

          <TabsContent value="aci" className="space-y-6">
            <ACIDashboardSection 
              indicators={indicators} 
              loading={indicatorsLoading}
            />
          </TabsContent>

          <TabsContent value="cpam" className="space-y-6">
            <CPAMDossiersSection />
          </TabsContent>

          <TabsContent value="planning" className="space-y-6">
            <TeamPlanningSection />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsSection 
              indicators={indicators}
            />
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <DocumentationSection />
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <WritingAssistantSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
