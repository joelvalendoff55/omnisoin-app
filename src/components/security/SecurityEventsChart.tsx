"use client";

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp } from 'lucide-react';
import { SecurityEventsByDay } from '@/lib/securityMonitoring';

export type TimelinePeriod = 7 | 14 | 30;

interface SecurityEventsChartProps {
  data: SecurityEventsByDay[];
  loading: boolean;
  period: TimelinePeriod;
  onPeriodChange: (period: TimelinePeriod) => void;
}

const PERIOD_LABELS: Record<TimelinePeriod, string> = {
  7: '7 jours',
  14: '14 jours',
  30: '30 jours',
};

export default function SecurityEventsChart({ 
  data, 
  loading, 
  period, 
  onPeriodChange 
}: SecurityEventsChartProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      total: d.securityEvents + d.dataModifications + d.exports + d.rbacChanges,
    }));
  }, [data]);

  const hasData = chartData.some(d => d.total > 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution des événements de sécurité
            </CardTitle>
            <CardDescription>
              Historique sur les {PERIOD_LABELS[period]}
            </CardDescription>
          </div>
          <ToggleGroup 
            type="single" 
            value={String(period)} 
            onValueChange={(value) => value && onPeriodChange(Number(value) as TimelinePeriod)}
            size="sm"
          >
            <ToggleGroupItem value="7" aria-label="7 jours">
              7j
            </ToggleGroupItem>
            <ToggleGroupItem value="14" aria-label="14 jours">
              14j
            </ToggleGroupItem>
            <ToggleGroupItem value="30" aria-label="30 jours">
              30j
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible sur cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorModifications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorExports" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorRbac" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="securityEvents"
                name="Événements sécurité"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorSecurity)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="dataModifications"
                name="Modifications données"
                stroke="hsl(217, 91%, 60%)"
                fillOpacity={1}
                fill="url(#colorModifications)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="exports"
                name="Exports"
                stroke="hsl(271, 91%, 65%)"
                fillOpacity={1}
                fill="url(#colorExports)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="rbacChanges"
                name="Modifs champs médicaux"
                stroke="hsl(25, 95%, 53%)"
                fillOpacity={1}
                fill="url(#colorRbac)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
