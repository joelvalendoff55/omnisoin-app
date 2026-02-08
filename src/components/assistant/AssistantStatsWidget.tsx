import { Users, Phone, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssistantStats } from '@/hooks/useAssistantDashboard';

interface AssistantStatsWidgetProps {
  stats: AssistantStats;
  loading: boolean;
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'primary' | 'success' | 'warning' | 'info';
  loading?: boolean;
}

function StatItem({ icon: Icon, label, value, color, loading }: StatItemProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AssistantStatsWidget({ stats, loading }: AssistantStatsWidgetProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatItem
        icon={Users}
        label="Patients reçus"
        value={stats.patientsReceived}
        color="success"
        loading={loading}
      />
      <StatItem
        icon={Clock}
        label="En attente"
        value={stats.queueWaiting}
        color="warning"
        loading={loading}
      />
      <StatItem
        icon={Phone}
        label="Appels/Rappels"
        value={stats.callsMade}
        color="info"
        loading={loading}
      />
      <StatItem
        icon={Calendar}
        label="RDV pris"
        value={stats.appointmentsTaken}
        color="primary"
        loading={loading}
      />
    </div>
  );
}
