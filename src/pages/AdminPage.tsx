import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Settings, Clock, Flag, Users, FileText } from 'lucide-react';
import {
  AdminStatsSection,
  StructureSettingsSection,
  OpeningHoursSection,
  PriorityLevelsSection,
  OCRStatsSection,
} from '@/components/admin';
import ConsultationReasonsList from '@/components/settings/ConsultationReasonsList';
import FeatureFlagsSection from '@/components/settings/FeatureFlagsSection';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();

  // Access control
  if (authLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin && !isCoordinator) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Accès restreint</CardTitle>
              <CardDescription>
                Vous n'avez pas les droits nécessaires pour accéder à cette page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground">
            Gérez les statistiques, paramètres et configuration de votre structure
          </p>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Statistiques</span>
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Structure</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horaires</span>
            </TabsTrigger>
            <TabsTrigger value="motifs" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Motifs</span>
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Priorités</span>
            </TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <AdminStatsSection />
            
            {/* OCR Import Statistics */}
            <Separator className="my-8" />
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statistiques OCR
              </h2>
              <OCRStatsSection />
            </div>
            
            {/* Feature Flags (Admin only) */}
            {isAdmin && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Fonctionnalités</h2>
                <FeatureFlagsSection />
              </div>
            )}
          </TabsContent>

          {/* Structure Settings Tab */}
          <TabsContent value="structure">
            <StructureSettingsSection />
          </TabsContent>

          {/* Opening Hours Tab */}
          <TabsContent value="hours">
            <OpeningHoursSection />
          </TabsContent>

          {/* Consultation Reasons Tab */}
          <TabsContent value="motifs">
            <ConsultationReasonsList />
          </TabsContent>

          {/* Priority Levels Tab */}
          <TabsContent value="priorities">
            <PriorityLevelsSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
