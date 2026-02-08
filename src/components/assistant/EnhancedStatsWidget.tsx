import { Users, Clock, Calendar, FileText, Stethoscope, CheckSquare, TrendingUp, PhoneCall } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AssistantStats } from '@/hooks/useAssistantDashboard';

interface EnhancedStatsWidgetProps {
  stats: AssistantStats;
  loading: boolean;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  subValue?: string;
  variant: 'success' | 'warning' | 'info' | 'primary' | 'muted';
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

const variantStyles = {
  success: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  muted: 'bg-muted text-muted-foreground border-border',
};

const iconStyles = {
  success: 'bg-green-500/20 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  primary: 'bg-primary/20 text-primary',
  muted: 'bg-muted-foreground/20 text-muted-foreground',
};

function StatCard({ icon: Icon, label, value, subValue, variant, loading, trend }: StatCardProps) {
  return (
    <Card className={cn('border transition-all hover:shadow-sm', variantStyles[variant])}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold">{value}</span>
                {trend && trend !== 'neutral' && (
                  <TrendingUp className={cn(
                    'h-3 w-3',
                    trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
                  )} />
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground truncate">{label}</p>
            {subValue && (
              <p className="text-[9px] text-muted-foreground/70">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EnhancedStatsWidget({ stats, loading }: EnhancedStatsWidgetProps) {
  return (
    <div className="space-y-3">
      {/* Primary Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Users}
          label="Patients reçus"
          value={stats.patientsReceived}
          variant="success"
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="En attente"
          value={stats.queueWaiting}
          variant={stats.queueWaiting > 5 ? 'warning' : 'muted'}
          loading={loading}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Stethoscope}
          label="Consultations"
          value={stats.consultationsToday}
          variant="primary"
          loading={loading}
        />
        <StatCard
          icon={Calendar}
          label="RDV à venir"
          value={stats.upcomingAppointments}
          variant="info"
          loading={loading}
        />
      </div>

      {/* Tertiary Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={FileText}
          label="Documents"
          value={stats.documentsToProcess}
          subValue="à traiter"
          variant={stats.documentsToProcess > 0 ? 'warning' : 'muted'}
          loading={loading}
        />
        <StatCard
          icon={CheckSquare}
          label="Tâches"
          value={stats.pendingTasks}
          subValue="en attente"
          variant={stats.pendingTasks > 3 ? 'warning' : 'muted'}
          loading={loading}
        />
      </div>

      {/* Quick metrics */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50 text-xs">
        <div className="flex items-center gap-1.5">
          <PhoneCall className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Appels:</span>
          <span className="font-medium">{stats.callsMade}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">RDV pris:</span>
          <span className="font-medium">{stats.appointmentsTaken}</span>
        </div>
      </div>
    </div>
  );
}
