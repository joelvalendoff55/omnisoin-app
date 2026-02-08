import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeeklyActivity } from '@/lib/dashboardStats';

interface ActivityChartProps {
  data: WeeklyActivity[];
  loading: boolean;
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      name: d.dayLabel,
    }));
  }, [data]);

  const maxConsultations = useMemo(() => {
    return Math.max(...data.map(d => d.consultations), 5);
  }, [data]);

  const maxWaitTime = useMemo(() => {
    return Math.max(...data.map(d => d.avgWaitTime), 30);
  }, [data]);

  if (loading) {
    return (
      <Card data-testid="dashboard-activity-chart">
        <CardHeader>
          <CardTitle>Activité de la semaine</CardTitle>
          <CardDescription>Consultations et temps d'attente moyen</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.consultations > 0 || d.avgWaitTime > 0);

  return (
    <Card data-testid="dashboard-activity-chart">
      <CardHeader>
        <CardTitle>Activité de la semaine</CardTitle>
        <CardDescription>Consultations et temps d'attente moyen</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Aucune donnée pour cette semaine
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                domain={[0, maxConsultations + 2]}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                domain={[0, maxWaitTime + 10]}
                unit=" min"
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (name === 'consultations') return [value, 'Consultations'];
                  if (name === 'avgWaitTime') return [`${value} min`, 'Attente moyenne'];
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value: string) => {
                  if (value === 'consultations') return 'Consultations';
                  if (value === 'avgWaitTime') return 'Attente moy.';
                  return value;
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="consultations"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgWaitTime"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 0, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
