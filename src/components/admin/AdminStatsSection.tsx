import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboardStats, useStructureSettings } from '@/hooks/useStructureAdmin';
import { useStructureId } from '@/hooks/useStructureId';
import { exportStatsToCSV, downloadCSV } from '@/lib/structureAdmin';
import { generateStatsPdf } from '@/lib/statsPdf';
import { Users, Calendar, Clock, Download, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

export function AdminStatsSection() {
  const { stats, loading, refetch } = useAdminDashboardStats();
  const { settings } = useStructureSettings();
  const { structureId } = useStructureId();
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportCSV = () => {
    if (!stats) return;
    const csv = exportStatsToCSV(stats);
    const filename = `stats-structure-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(csv, filename);
  };

  const handleExportPDF = async () => {
    if (!stats || !structureId) return;
    
    setExportingPdf(true);
    try {
      // Fetch structure name
      const { data: structure } = await supabase
        .from('structures')
        .select('name, address, phone')
        .eq('id', structureId)
        .single();

      await generateStatsPdf(stats, {
        name: structure?.name || 'Structure',
        logoUrl: settings?.logo_url,
        address: structure?.address,
        phone: structure?.phone,
      });
      
      toast.success('Rapport PDF généré');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Impossible de charger les statistiques
      </div>
    );
  }

  // Prepare chart data for last 30 days
  const consultationsChartData = stats.consultationsLast30Days.map((d) => ({
    date: format(new Date(d.date), 'dd/MM', { locale: fr }),
    consultations: d.count,
  }));

  // Prepare peak hours data
  const peakHoursData = stats.peakHours.slice(0, 12).map((h) => ({
    hour: `${h.hour}h`,
    patients: h.count,
  }));

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
        <Button onClick={handleExportPDF} variant="default" size="sm" disabled={exportingPdf}>
          {exportingPdf ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Rapport PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients du jour</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patientsToday}</div>
            <p className="text-xs text-muted-foreground">Arrivées aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultationsThisWeek}</div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps d'attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWaitTimeMinutes} min</div>
            <p className="text-xs text-muted-foreground">Moyenne (7 jours)</p>
          </CardContent>
        </Card>
      </div>

      {/* Consultations Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution des consultations
          </CardTitle>
          <CardDescription>30 derniers jours</CardDescription>
        </CardHeader>
        <CardContent>
          {consultationsChartData.some((d) => d.consultations > 0) ? (
            <ChartContainer
              config={{
                consultations: { label: 'Consultations', color: 'hsl(var(--chart-1))' },
              }}
              className="h-[250px] w-full"
            >
              <AreaChart data={consultationsChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  interval="preserveStartEnd"
                  tickFormatter={(value, index) => index % 5 === 0 ? value : ''}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="consultations"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                  name="Consultations"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Aucune consultation récente
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pics d'affluence
          </CardTitle>
          <CardDescription>Heures les plus chargées (7 derniers jours)</CardDescription>
        </CardHeader>
        <CardContent>
          {peakHoursData.length > 0 ? (
            <ChartContainer
              config={{
                patients: { label: 'Patients', color: 'hsl(var(--chart-2))' },
              }}
              className="h-[200px] w-full"
            >
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="patients" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Patients" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Aucune donnée d'affluence
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
