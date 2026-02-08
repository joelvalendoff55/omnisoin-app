"use client";

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStatsDashboard } from '@/hooks/useStatsDashboard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Inbox,
  Mic,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Calendar,
  CheckSquare,
  AlertTriangle,
  UserCheck,
  ListTodo,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

// Color palette for charts
const COLORS = {
  primary: 'hsl(var(--primary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(142, 71%, 45%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  muted: 'hsl(var(--muted-foreground))',
  blue: 'hsl(217, 91%, 60%)',
  purple: 'hsl(270, 70%, 60%)',
  teal: 'hsl(180, 60%, 45%)',
};

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { data: stats, loading: statsLoading, error } = useStatsDashboard();
  const router = useRouter();

  // Redirect non-admin/coordinator
  useEffect(() => {
    if (!roleLoading && !isAdmin && !isCoordinator) {
      navigate('/');
    }
  }, [isAdmin, isCoordinator, roleLoading, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const isPageLoading = authLoading || roleLoading;

  if (isPageLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !isCoordinator) {
    return null;
  }

  // Prepare chart data
  const queueStatusData = stats ? [
    { name: 'En attente', value: stats.queue_waiting, color: COLORS.warning },
    { name: 'En cours', value: stats.queue_in_progress, color: COLORS.blue },
    { name: 'Terminés (7j)', value: stats.queue_completed_7d, color: COLORS.success },
  ].filter(d => d.value > 0) : [];

  const taskStatusData = stats ? [
    { name: 'En attente', value: stats.tasks_pending, color: COLORS.warning },
    { name: 'En cours', value: stats.tasks_in_progress, color: COLORS.blue },
    { name: 'Terminées (7j)', value: stats.tasks_completed_7d, color: COLORS.success },
    { name: 'En retard', value: stats.tasks_overdue, color: COLORS.destructive },
  ].filter(d => d.value > 0) : [];

  const transcriptStatusData = stats ? [
    { name: 'En attente', value: stats.transcripts_uploaded, color: COLORS.warning },
    { name: 'Prêt', value: stats.transcripts_ready, color: COLORS.success },
    { name: 'Échoué', value: stats.transcripts_failed, color: COLORS.destructive },
  ].filter(d => d.value > 0) : [];

  const metricsOverview = stats ? [
    { name: 'Patients', value: stats.patients_active },
    { name: 'File attente', value: stats.queue_waiting + stats.queue_in_progress },
    { name: 'RDV (7j)', value: stats.appointments_upcoming_7d },
    { name: 'Tâches', value: stats.tasks_pending },
    { name: 'Messages', value: stats.inbox_7d },
    { name: 'Transcripts', value: stats.transcripts_7d },
  ] : [];

  return (
    <DashboardLayout>
      <div data-testid="stats-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Tableau de bord statistiques
            </h1>
            <p className="text-muted-foreground mt-1">
              Vue d'ensemble de l'activité de la structure
            </p>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main KPI Cards - Row 1: Patients & Queue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Patients */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Patients actifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.patients_active ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                +{stats?.patients_new_30d ?? 0} ce mois
              </p>
            </CardContent>
          </Card>

          {/* Queue Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                File d'attente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {(stats?.queue_waiting ?? 0) + (stats?.queue_in_progress ?? 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.queue_waiting ?? 0} en attente · {stats?.queue_in_progress ?? 0} en cours
              </p>
            </CardContent>
          </Card>

          {/* Appointments Today */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                RDV aujourd'hui
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.appointments_today ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.appointments_completed_today ?? 0} terminés · {stats?.appointments_upcoming_7d ?? 0} à venir (7j)
              </p>
            </CardContent>
          </Card>

          {/* Tasks Pending */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Tâches en attente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.tasks_pending ?? 0}</div>
              )}
              {(stats?.tasks_overdue ?? 0) > 0 && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats?.tasks_overdue} en retard
                </p>
              )}
              {(stats?.tasks_overdue ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.tasks_in_progress ?? 0} en cours
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Row 2: Documents & Transcripts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Inbox Messages */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Messages (7j)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.inbox_7d ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.inbox_unassigned ?? 0} non assignés
              </p>
            </CardContent>
          </Card>

          {/* Transcripts */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Transcriptions (7j)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.transcripts_7d ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.transcripts_ready ?? 0} prêts · {stats?.transcripts_uploaded ?? 0} en attente
              </p>
            </CardContent>
          </Card>

          {/* AI Summaries */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Résumés IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.summaries_ready ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.summaries_failed ?? 0} échoués
              </p>
            </CardContent>
          </Card>

          {/* Average Wait Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Temps d'attente moyen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {stats?.avg_wait_time_minutes_7d ?? 0} min
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Sur les 7 derniers jours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Overview Bar Chart */}
        <Card data-testid="stats-overview-chart">
          <CardHeader>
            <CardTitle className="text-lg">Vue d'ensemble des métriques</CardTitle>
            <CardDescription>Comparaison des indicateurs clés</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metricsOverview} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue by Status */}
          <Card data-testid="stats-queue">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                File d'attente
              </CardTitle>
              <CardDescription>Répartition par statut</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : queueStatusData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={queueStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {queueStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {queueStatusData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs">{item.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks by Status */}
          <Card data-testid="stats-tasks">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Tâches
              </CardTitle>
              <CardDescription>Répartition par statut</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : taskStatusData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {taskStatusData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs">{item.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcripts by Status */}
          <Card data-testid="stats-transcripts">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Transcriptions
              </CardTitle>
              <CardDescription>Répartition par statut</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : transcriptStatusData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={transcriptStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {transcriptStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {transcriptStatusData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs">{item.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - AI Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Summaries Performance */}
          <Card data-testid="stats-summaries">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Performance IA
              </CardTitle>
              <CardDescription>Résumés automatiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {statsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <div className="flex items-center gap-2 text-success mb-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">Réussis</span>
                      </div>
                      <div className="text-3xl font-bold">{stats?.summaries_ready ?? 0}</div>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm font-medium">Échoués</span>
                      </div>
                      <div className="text-3xl font-bold">{stats?.summaries_failed ?? 0}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taux de réussite</span>
                      <span className="font-medium">
                        {stats && (stats.summaries_ready + stats.summaries_failed) > 0
                          ? Math.round(
                              (stats.summaries_ready / (stats.summaries_ready + stats.summaries_failed)) * 100
                            )
                          : 100}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-success h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            stats && (stats.summaries_ready + stats.summaries_failed) > 0
                              ? (stats.summaries_ready / (stats.summaries_ready + stats.summaries_failed)) * 100
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Latence moyenne</span>
                    <span className="font-medium">
                      {stats?.avg_summary_latency_ms_7d 
                        ? `${(stats.avg_summary_latency_ms_7d / 1000).toFixed(1)}s`
                        : 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Queue Performance */}
          <Card data-testid="stats-queue-performance">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Performance file d'attente
              </CardTitle>
              <CardDescription>Consultations terminées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {statsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                      <div className="text-2xl font-bold">{stats?.queue_completed_today ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Aujourd'hui</div>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                      <div className="text-2xl font-bold">{stats?.queue_completed_7d ?? 0}</div>
                      <div className="text-xs text-muted-foreground">7 jours</div>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                      <div className="text-2xl font-bold">{stats?.queue_completed_30d ?? 0}</div>
                      <div className="text-xs text-muted-foreground">30 jours</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Temps d'attente moyen (7j)</span>
                      <span className="font-medium">
                        {stats?.avg_wait_time_minutes_7d ?? 0} min
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
