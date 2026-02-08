import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  SystemHealthDashboard,
  ComplianceReportGenerator,
  WorkflowSimulator,
  SystemReadinessChecker,
} from '@/components/compliance';
import { useRole } from '@/hooks/useRole';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { Shield, FileText, PlayCircle, ClipboardCheck } from 'lucide-react';

export default function CompliancePage() {
  const { isAdmin, isCoordinator, loading } = useRole();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !isCoordinator) {
    return <NoAccessPage />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Conformité & Certification</h1>
          <p className="text-muted-foreground">
            Vérifications de santé système, rapports HAS et tests de conformité
          </p>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Santé Système
            </TabsTrigger>
            <TabsTrigger value="readiness" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Rapports HAS
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Simulateur
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="readiness">
            <SystemReadinessChecker />
          </TabsContent>

          <TabsContent value="reports">
            <ComplianceReportGenerator />
          </TabsContent>

          <TabsContent value="simulator">
            <WorkflowSimulator />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
