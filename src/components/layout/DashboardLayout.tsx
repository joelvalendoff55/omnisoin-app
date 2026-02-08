import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import GlobalSearch from '@/components/search/GlobalSearch';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';
import { BugReportButton } from '@/components/bug-report/BugReportButton';
import { PatientContextBadge } from '@/components/patient/PatientContextBadge';

interface DashboardLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function DashboardLayout({ children, hideSidebar = false }: DashboardLayoutProps) {
  // Enable realtime notifications for the dashboard
  useRealtimeNotifications({ enabled: true, throttleMs: 2000 });

  return (
    <div className="flex min-h-screen bg-background">
      <div className={cn(
        "transition-all duration-300",
        hideSidebar ? "w-0 opacity-0 overflow-hidden" : "w-auto"
      )}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Global Search */}
        <header className={cn(
          "sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-8 py-4 transition-opacity duration-300",
          hideSidebar && "opacity-0 h-0 overflow-hidden py-0 border-0"
        )}>
          <div className="flex items-center justify-between">
            <GlobalSearch />
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className={cn("p-8", hideSidebar && "pt-4")}>{children}</div>
        </main>
      </div>
      
      {/* Patient Context Badge - visible on clinical pages */}
      <PatientContextBadge />
      
      {/* Bug Report Button - visible on all pages */}
      <BugReportButton />
    </div>
  );
}
