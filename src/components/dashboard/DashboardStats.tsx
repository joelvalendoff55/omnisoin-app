import Link from "next/link";
import { Users, Clock, Calendar, CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TodayStats } from '@/lib/dashboardStats';

interface DashboardStatsProps {
  stats: TodayStats;
  loading: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
  color: 'primary' | 'accent' | 'warning' | 'success';
  testId: string;
}

function StatCard({ title, value, subtitle, icon: Icon, href, loading, color, testId }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/50 text-accent-foreground',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const content = (
    <Card 
      className={`transition-all ${href ? 'hover:shadow-md hover:border-primary/20 cursor-pointer' : ''}`}
      data-testid={testId}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value}</p>
            )}
            {subtitle && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        testId="dashboard-stat-patients-today"
        title="Patients vus aujourd'hui"
        value={stats.patientsToday}
        icon={Users}
        href="/queue?status=completed"
        loading={loading}
        color="success"
      />
      <StatCard
        testId="dashboard-stat-queue"
        title="File d'attente"
        value={stats.queueWaiting + stats.queueInProgress}
        subtitle={`${stats.queueWaiting} en attente · ${stats.queueInProgress} en cours`}
        icon={Clock}
        href="/queue"
        loading={loading}
        color="warning"
      />
      <StatCard
        testId="dashboard-stat-appointments"
        title="Rendez-vous du jour"
        value={stats.appointmentsToday}
        subtitle={stats.appointmentsCompleted > 0 ? `${stats.appointmentsCompleted} terminés` : undefined}
        icon={Calendar}
        href="/agenda"
        loading={loading}
        color="primary"
      />
      <StatCard
        testId="dashboard-stat-tasks"
        title="Tâches en attente"
        value={stats.tasksPending}
        icon={CheckSquare}
        href="/tasks"
        loading={loading}
        color="accent"
      />
    </div>
  );
}
