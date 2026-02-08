import { useMemo } from 'react';
import {
  BarChart,
  Bar,
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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WeeklyActivity } from '@/lib/dashboardStats';
import type { Appointment } from '@/lib/appointments';

interface DashboardChartsProps {
  weeklyActivity: WeeklyActivity[];
  appointments: Appointment[];
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#f97316'];

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  followup: 'Suivi',
  emergency: 'Urgence',
  teleconsultation: 'Téléconsultation',
  pdsa: 'PDSA',
  other: 'Autre',
};

export default function DashboardCharts({
  weeklyActivity,
  appointments,
  loading,
}: DashboardChartsProps) {
  // Appointment type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((apt) => {
      const type = apt.appointment_type || 'other';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: APPOINTMENT_TYPE_LABELS[type] || type,
      value: count,
    }));
  }, [appointments]);

  // Occupancy rate by hour
  const occupancyByHour = useMemo(() => {
    const hours: Record<number, { scheduled: number; completed: number }> = {};
    
    // Initialize hours 8-19
    for (let i = 8; i <= 19; i++) {
      hours[i] = { scheduled: 0, completed: 0 };
    }
    
    appointments.forEach((apt) => {
      const hour = new Date(apt.start_time).getHours();
      if (hours[hour]) {
        hours[hour].scheduled++;
        if (apt.status === 'completed') {
          hours[hour].completed++;
        }
      }
    });
    
    return Object.entries(hours).map(([hour, data]) => ({
      hour: `${hour}h`,
      programmés: data.scheduled,
      réalisés: data.completed,
      taux: data.scheduled > 0 ? Math.round((data.completed / data.scheduled) * 100) : 0,
    }));
  }, [appointments]);

  if (loading) {
    return (
      <Card>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Statistiques</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">Tendances</TabsTrigger>
            <TabsTrigger value="distribution">Répartition</TabsTrigger>
            <TabsTrigger value="occupancy">Occupation</TabsTrigger>
          </TabsList>

          {/* Weekly trends */}
          <TabsContent value="trends" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dayLabel" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="consultations"
                    name="Consultations"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="avgWaitTime"
                    name="Attente moy. (min)"
                    fill="hsl(var(--warning))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Type distribution */}
          <TabsContent value="distribution" className="mt-4">
            <div className="h-[250px]">
              {typeDistribution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          {/* Occupancy rate */}
          <TabsContent value="occupancy" className="mt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancyByHour}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="programmés"
                    name="Programmés"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="réalisés"
                    name="Réalisés"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
