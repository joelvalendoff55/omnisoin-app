import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AutoRecordingProvider } from "@/hooks/useAutoRecording";
import { PatientConsultationProvider } from "@/hooks/usePatientConsultationContext";
import { PatientAuthProvider, usePatientAuth } from "@/hooks/usePatientAuth";
import { AdminPatientProvider, useAdminPatientContext } from "@/hooks/useAdminPatientContext";
import { FloatingRecordingIndicator } from "@/components/recording/FloatingRecordingIndicator";
import { MFAGuard } from "@/components/auth/MFAGuard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import Index from "./pages/Index";
import AssistantDashboard from "./pages/AssistantDashboard";
import Auth from "./pages/Auth";
import Patients from "./pages/Patients";
import PatientDetailPage from "./pages/PatientDetailPage";
import TeamPage from "./pages/TeamPage";
import QueuePage from "./pages/QueuePage";
import TasksPage from "./pages/TasksPage";
import AgendaPage from "./pages/AgendaPage";
import DelegationsPage from "./pages/DelegationsPage";
import ActivityPage from "./pages/ActivityPage";
import InboxPage from "./pages/InboxPage";
import DocumentsPage from "./pages/DocumentsPage";
import TranscriptsPage from "./pages/TranscriptsPage";
import Settings from "./pages/Settings";
import SettingsIntegrationsPage from "./pages/SettingsIntegrationsPage";
import StatsPage from "./pages/StatsPage";
import CoordinationPage from "./pages/CoordinationPage";
import CoordinatricePage from "./pages/CoordinatricePage";
import IPAPage from "./pages/IPAPage";
import MedecinPage from "./pages/MedecinPage";
import MedecinDashboard from "./pages/MedecinDashboard";
import CotationPage from "./pages/CotationPage";
import BillingPage from "./pages/BillingPage";
import FileAttentePage from "./pages/FileAttentePage";
import PromptsAdmin from "./pages/PromptsAdmin";
import AdminPromptsPage from "./pages/AdminPromptsPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import SuperAdminStructureDetailPage from "./pages/SuperAdminStructureDetailPage";
import {
  SuperAdminDashboard,
  SuperAdminOrganizations,
  SuperAdminAdministrators,
  SuperAdminTeams,
  SuperAdminSettings,
} from "./pages/super-admin";
import AdminPage from "./pages/AdminPage";
import GdprAuditPage from "./pages/GdprAuditPage";
import ImmutableAuditPage from "./pages/ImmutableAuditPage";
import ExportsPage from "./pages/ExportsPage";
import CompliancePage from "./pages/CompliancePage";
import SecurityMonitoringPage from "./pages/SecurityMonitoringPage";
import OrdonnancesPage from "./pages/OrdonnancesPage";
import ExamPlanningPage from "./pages/ExamPlanningPage";
import EncounterPage from "./pages/EncounterPage";
import NotFound from "./pages/NotFound";
import PrivacyPage from "./pages/PrivacyPage";
import LegalPage from "./pages/LegalPage";
import LegalAidPage from "./pages/LegalAidPage";
import TermsPage from "./pages/TermsPage";
import CookieConsent from "./components/gdpr/CookieConsent";
import PatientMessagesPage from "./pages/PatientMessagesPage";
import {
  PatientAuthPage,
  PatientDashboard,
  PatientAppointments,
  PatientMessages,
  PatientDocuments,
  PatientProfile,
} from "./pages/patient";

const queryClient = new QueryClient();

// Protected route for patient portal - allows patient auth OR admin access
function PatientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: isPatientAuthenticated, loading: patientLoading } = usePatientAuth();
  const { user, loading: authLoading } = useAuth();
  const { isAdminMode, selectedPatient, loading: adminLoading } = useAdminPatientContext();
  
  const isLoading = patientLoading || (user && (authLoading || adminLoading));
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  // Allow access if: patient is authenticated OR (admin is logged in AND has selected a patient)
  const hasPatientAccess = isPatientAuthenticated;
  const hasAdminAccess = isAdminMode && selectedPatient;
  
  if (!hasPatientAccess && !hasAdminAccess) {
    // If admin is logged in but hasn't selected a patient, redirect to dashboard to select one
    if (isAdminMode && !selectedPatient) {
      return <Navigate to="/patient-portal/dashboard" replace />;
    }
    return <Navigate to="/patient-portal/login" replace />;
  }
  
  return <>{children}</>;
}

// Special route for dashboard that allows admin without patient selection
function PatientDashboardRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: isPatientAuthenticated, loading: patientLoading } = usePatientAuth();
  const { user, loading: authLoading } = useAuth();
  const { isAdminMode, loading: adminLoading } = useAdminPatientContext();
  
  const isLoading = patientLoading || (user && (authLoading || adminLoading));
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  // Allow access if: patient is authenticated OR admin is logged in (even without patient selection)
  if (!isPatientAuthenticated && !isAdminMode) {
    return <Navigate to="/patient-portal/login" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary errorMessage="Une erreur inattendue s'est produite. Veuillez rafraîchir la page.">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PatientAuthProvider>
          <AdminPatientProvider>
            <AutoRecordingProvider>
              <PatientConsultationProvider>
                <TooltipProvider>
                  <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* Patient Portal Routes */}
                    <Route path="/patient-portal" element={<Navigate to="/patient-portal/login" replace />} />
                    <Route path="/patient-portal/login" element={<PatientAuthPage />} />
                    <Route path="/patient-portal/dashboard" element={<PatientDashboardRoute><PatientDashboard /></PatientDashboardRoute>} />
                    <Route path="/patient-portal/appointments" element={<PatientProtectedRoute><PatientAppointments /></PatientProtectedRoute>} />
                    <Route path="/patient-portal/messages" element={<PatientProtectedRoute><PatientMessages /></PatientProtectedRoute>} />
                    <Route path="/patient-portal/documents" element={<PatientProtectedRoute><PatientDocuments /></PatientProtectedRoute>} />
                    <Route path="/patient-portal/profile" element={<PatientProtectedRoute><PatientProfile /></PatientProtectedRoute>} />
                  
                  {/* Practitioner Routes */}
                  <Route path="/" element={<MFAGuard><Index /></MFAGuard>} />
                  <Route path="/assistant-dashboard" element={<MFAGuard><AssistantDashboard /></MFAGuard>} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/patients" element={<MFAGuard><Patients /></MFAGuard>} />
                  <Route path="/patients/:id" element={<MFAGuard><PatientDetailPage /></MFAGuard>} />
                  <Route path="/team" element={<MFAGuard><TeamPage /></MFAGuard>} />
                  <Route path="/team/delegations" element={<MFAGuard><DelegationsPage /></MFAGuard>} />
                  <Route path="/queue" element={<MFAGuard><QueuePage /></MFAGuard>} />
                  <Route path="/tasks" element={<MFAGuard><TasksPage /></MFAGuard>} />
                  <Route path="/agenda" element={<MFAGuard><AgendaPage /></MFAGuard>} />
                  <Route path="/activity" element={<MFAGuard><ActivityPage /></MFAGuard>} />
                  <Route path="/inbox" element={<MFAGuard><InboxPage /></MFAGuard>} />
                  <Route path="/messagerie-patients" element={<MFAGuard><PatientMessagesPage /></MFAGuard>} />
                  <Route path="/documents" element={<MFAGuard><DocumentsPage /></MFAGuard>} />
                  <Route path="/transcripts" element={<MFAGuard><TranscriptsPage /></MFAGuard>} />
                  <Route path="/settings" element={<MFAGuard><Settings /></MFAGuard>} />
                  <Route path="/settings/integrations" element={<MFAGuard><SettingsIntegrationsPage /></MFAGuard>} />
                  <Route path="/stats" element={<MFAGuard><StatsPage /></MFAGuard>} />
                  <Route path="/coordination" element={<MFAGuard><CoordinatricePage /></MFAGuard>} />
                  <Route path="/coordinatrice" element={<MFAGuard><CoordinatricePage /></MFAGuard>} />
                  <Route path="/ipa" element={<MFAGuard><IPAPage /></MFAGuard>} />
                  <Route path="/medecin" element={<MFAGuard><MedecinPage /></MFAGuard>} />
                  <Route path="/medecin-dashboard" element={<MFAGuard><MedecinDashboard /></MFAGuard>} />
                  <Route path="/cotation" element={<MFAGuard><CotationPage /></MFAGuard>} />
                  <Route path="/billing" element={<MFAGuard><BillingPage /></MFAGuard>} />
                  <Route path="/file-attente" element={<MFAGuard><FileAttentePage /></MFAGuard>} />
                  <Route path="/prompts-admin" element={<MFAGuard><PromptsAdmin /></MFAGuard>} />
                  <Route path="/admin/prompts" element={<MFAGuard><AdminPromptsPage /></MFAGuard>} />
                  <Route path="/admin" element={<MFAGuard><AdminPage /></MFAGuard>} />
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/organizations" element={<SuperAdminOrganizations />} />
                  <Route path="/super-admin/administrators" element={<SuperAdminAdministrators />} />
                  <Route path="/super-admin/teams" element={<SuperAdminTeams />} />
                  <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
                  <Route path="/super-admin/structure/:id" element={<MFAGuard><SuperAdminStructureDetailPage /></MFAGuard>} />
                  <Route path="/gdpr-audit" element={<MFAGuard><GdprAuditPage /></MFAGuard>} />
                  <Route path="/immutable-audit" element={<MFAGuard><ImmutableAuditPage /></MFAGuard>} />
                  <Route path="/exports" element={<MFAGuard><ExportsPage /></MFAGuard>} />
                  <Route path="/compliance" element={<MFAGuard><CompliancePage /></MFAGuard>} />
                  <Route path="/security-monitoring" element={<MFAGuard><SecurityMonitoringPage /></MFAGuard>} />
                  <Route path="/ordonnances" element={<MFAGuard><OrdonnancesPage /></MFAGuard>} />
                  <Route path="/exam-planning" element={<MFAGuard><ExamPlanningPage /></MFAGuard>} />
                  <Route path="/encounter/:id" element={<MFAGuard><EncounterPage /></MFAGuard>} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/legal" element={<LegalPage />} />
                  <Route path="/legal-aid" element={<LegalAidPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CookieConsent />
                <FloatingRecordingIndicator />
              </BrowserRouter>
            </TooltipProvider>
          </PatientConsultationProvider>
        </AutoRecordingProvider>
      </AdminPatientProvider>
    </PatientAuthProvider>
  </AuthProvider>
</QueryClientProvider>
  </ErrorBoundary>
);

export default App;
