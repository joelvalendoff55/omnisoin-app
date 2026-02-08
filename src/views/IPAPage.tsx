"use client";

import { useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ComplexCasesSection } from '@/components/ipa/ComplexCasesSection';
import { WritingAidSection } from '@/components/ipa/WritingAidSection';
import { CPTSRelationsSection } from '@/components/ipa/CPTSRelationsSection';
import { CooperationProtocolsSection } from '@/components/ipa/CooperationProtocolsSection';
import { PatientConsultationBanner } from '@/components/patient/PatientConsultationBanner';
import { PatientSelector } from '@/components/patient/PatientSelector';
import { AlertTriangle, Stethoscope } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function IPAPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, isPractitioner, loading: roleLoading } = useRole();

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

  // IPA page accessible to admins, coordinators, and practitioners
  if (!isAdmin && !isCoordinator && !isPractitioner) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Accès refusé</h2>
          <p className="text-muted-foreground">Cette page est réservée aux IPA et praticiens.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Patient Context Banner */}
        <PatientConsultationBanner />
        <PatientSelector />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-7 w-7" />
              Espace IPA
            </h1>
            <p className="text-muted-foreground">
              Infirmier(e) en Pratique Avancée - Suivi des cas complexes et coordination
            </p>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cases">Cas complexes</TabsTrigger>
            <TabsTrigger value="writing">Aide rédaction</TabsTrigger>
            <TabsTrigger value="cpts">Relations CPTS</TabsTrigger>
            <TabsTrigger value="protocols">Protocoles</TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="space-y-6">
            <ComplexCasesSection />
          </TabsContent>

          <TabsContent value="writing" className="space-y-6">
            <WritingAidSection />
          </TabsContent>

          <TabsContent value="cpts" className="space-y-6">
            <CPTSRelationsSection />
          </TabsContent>

          <TabsContent value="protocols" className="space-y-6">
            <CooperationProtocolsSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
