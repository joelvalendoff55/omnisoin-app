"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { AutoRecordingProvider } from "@/hooks/useAutoRecording";
import { PatientConsultationProvider } from "@/hooks/usePatientConsultationContext";
import { PatientAuthProvider } from "@/hooks/usePatientAuth";
import { AdminPatientProvider } from "@/hooks/useAdminPatientContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { FloatingRecordingIndicator } from "@/components/recording/FloatingRecordingIndicator";
import CookieConsent from "@/components/gdpr/CookieConsent";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary errorMessage="Une erreur inattendue s'est produite. Veuillez rafraichir la page.">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PatientAuthProvider>
            <AdminPatientProvider>
              <AutoRecordingProvider>
                <PatientConsultationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    {children}
                    <CookieConsent />
                    <FloatingRecordingIndicator />
                  </TooltipProvider>
                </PatientConsultationProvider>
              </AutoRecordingProvider>
            </AdminPatientProvider>
          </PatientAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
