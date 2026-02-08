import DashboardLayout from '@/components/layout/DashboardLayout';
import SecurityMonitoringDashboard from '@/components/security/SecurityMonitoringDashboard';

export default function SecurityMonitoringPage() {
  return (
    <DashboardLayout>
      <SecurityMonitoringDashboard />
    </DashboardLayout>
  );
}
