"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Pill,
  Stethoscope,
  Scissors,
  Users,
  TrendingUp,
  Undo2,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';
import { useOCRStats } from '@/hooks/useOCRStats';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';
import { exportOCRStatsToCSV } from '@/lib/ocrStatsCsv';
import { OCRAlertConfigCard } from './OCRAlertConfigCard';
import { checkAndAlertReversionRate } from '@/lib/ocrReversionAlerts';

const COLORS = {
  medications: 'hsl(217, 91%, 60%)',
  diagnoses: 'hsl(38, 92%, 50%)',
  procedures: 'hsl(270, 70%, 60%)',
  active: 'hsl(142, 71%, 45%)',
  reverted: 'hsl(0, 84%, 60%)',
};

export function OCRStatsSection() {
  const { stats, loading, error } = useOCRStats();
  const { structureId } = useStructureId();
  const [structureName, setStructureName] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  // Fetch structure name for export and check alerts
  useEffect(() => {
    if (structureId) {
      supabase
        .from('structures')
        .select('name')
        .eq('id', structureId)
        .single()
        .then(({ data }) => {
          if (data?.name) setStructureName(data.name);
        });

      // Check alert on stats load
      checkAndAlertReversionRate(structureId).catch(console.error);
    }
  }, [structureId]);

  const handleExport = () => {
    if (!stats) return;
    
    setExporting(true);
    try {
      exportOCRStatsToCSV(stats, structureName);
      toast.success('Export CSV généré', {
        description: 'Le fichier a été téléchargé.',
      });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Impossible de charger les statistiques OCR</p>
        </CardContent>
      </Card>
    );
  }

  if (stats.totalImports === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun import OCR enregistré</p>
          <p className="text-sm mt-2">Les statistiques apparaîtront après le premier import.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const typeDistributionData = [
    { name: 'Traitements', value: stats.totalMedications, color: COLORS.medications },
    { name: 'Diagnostics', value: stats.totalDiagnoses, color: COLORS.diagnoses },
    { name: 'Interventions', value: stats.totalProcedures, color: COLORS.procedures },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'Actifs', value: stats.activeImports, color: COLORS.active },
    { name: 'Annulés', value: stats.revertedImports, color: COLORS.reverted },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exporter en CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total imports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalImports}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeImports} actifs, {stats.revertedImports} annulés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traitements</CardTitle>
            <Pill className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMedications}</div>
            <p className="text-xs text-muted-foreground">importés depuis OCR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
            <Stethoscope className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDiagnoses}</div>
            <p className="text-xs text-muted-foreground">importés depuis OCR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            <Scissors className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProcedures}</div>
            <p className="text-xs text-muted-foreground">importées depuis OCR</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Evolution par mois */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Évolution mensuelle
            </CardTitle>
            <CardDescription>Imports OCR sur les 6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.byPeriod}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="medications" 
                  name="Traitements" 
                  fill={COLORS.medications} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="diagnoses" 
                  name="Diagnostics" 
                  fill={COLORS.diagnoses} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="procedures" 
                  name="Interventions" 
                  fill={COLORS.procedures} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution par type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Répartition par type
            </CardTitle>
            <CardDescription>Distribution des données importées</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {typeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
          </CardContent>
        </Card>
      </div>

      {/* Practitioner Comparison Chart */}
      {stats.byPractitioner.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Comparaison des praticiens
            </CardTitle>
            <CardDescription>
              Performance OCR par praticien - Taux de succès et volume d'imports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.byPractitioner.map(p => ({
                  name: p.name.split(' ')[0] || p.name.substring(0, 10),
                  fullName: p.name,
                  imports: p.totalImports,
                  successRate: p.totalImports > 0 
                    ? Math.round(((p.totalImports - p.revertedCount) / p.totalImports) * 100) 
                    : 0,
                  medications: p.medicationsCount,
                  diagnoses: p.diagnosesCount,
                  procedures: p.proceduresCount,
                  reverted: p.revertedCount,
                }))}
                layout="vertical"
                margin={{ left: 20, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }} 
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'successRate') return [`${value}%`, 'Taux de succès'];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload?.[0]?.payload?.fullName) {
                      return payload[0].payload.fullName;
                    }
                    return label;
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md">
                        <p className="font-medium mb-2">{data.fullName}</p>
                        <div className="space-y-1 text-sm">
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Taux de succès:</span>
                            <span className={data.successRate >= 80 ? 'text-green-600 font-medium' : data.successRate >= 60 ? 'text-yellow-600' : 'text-destructive'}>
                              {data.successRate}%
                            </span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Total imports:</span>
                            <span>{data.imports}</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Traitements:</span>
                            <span>{data.medications}</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Diagnostics:</span>
                            <span>{data.diagnoses}</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Interventions:</span>
                            <span>{data.procedures}</span>
                          </p>
                          {data.reverted > 0 && (
                            <p className="flex justify-between gap-4 text-destructive">
                              <span>Annulés:</span>
                              <span>{data.reverted}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar 
                  dataKey="successRate" 
                  name="Taux de succès"
                  radius={[0, 4, 4, 0]}
                >
                  {stats.byPractitioner.map((p, index) => {
                    const rate = p.totalImports > 0 
                      ? ((p.totalImports - p.revertedCount) / p.totalImports) * 100 
                      : 0;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={rate >= 80 ? COLORS.active : rate >= 60 ? COLORS.diagnoses : COLORS.reverted}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.active }} />
                <span>≥80% (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.diagnoses }} />
                <span>60-79% (Correct)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.reverted }} />
                <span>&lt;60% (À améliorer)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Config and Practitioners */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Alert Configuration */}
        {structureId && <OCRAlertConfigCard structureId={structureId} />}

        {/* Par praticien */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Par praticien
            </CardTitle>
            <CardDescription>Activité d'import par utilisateur</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {stats.byPractitioner.map((practitioner) => (
                  <div 
                    key={practitioner.userId} 
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{practitioner.name}</span>
                      <Badge variant="secondary">
                        {practitioner.totalImports} import{practitioner.totalImports > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {practitioner.medicationsCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Pill className="h-3 w-3" />
                          {practitioner.medicationsCount}
                        </Badge>
                      )}
                      {practitioner.diagnosesCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {practitioner.diagnosesCount}
                        </Badge>
                      )}
                      {practitioner.proceduresCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Scissors className="h-3 w-3" />
                          {practitioner.proceduresCount}
                        </Badge>
                      )}
                      {practitioner.revertedCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <Undo2 className="h-3 w-3" />
                          {practitioner.revertedCount} annulé{practitioner.revertedCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {stats.byPractitioner.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucune donnée disponible
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Activité récente
            </CardTitle>
            <CardDescription>10 derniers imports OCR</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {stats.recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={`p-3 rounded-lg border ${
                      activity.status === 'reverted' ? 'bg-muted/50' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {activity.documentTitle || 'Document OCR'}
                      </span>
                      {activity.status === 'active' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {format(new Date(activity.importedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                      {' • '}{activity.importerName}
                    </div>
                    <div className="flex gap-1.5">
                      {activity.medicationsCount > 0 && (
                        <Badge variant="outline" className="text-xs px-1.5">
                          <Pill className="h-3 w-3 mr-0.5" />
                          {activity.medicationsCount}
                        </Badge>
                      )}
                      {activity.diagnosesCount > 0 && (
                        <Badge variant="outline" className="text-xs px-1.5">
                          <Stethoscope className="h-3 w-3 mr-0.5" />
                          {activity.diagnosesCount}
                        </Badge>
                      )}
                      {activity.proceduresCount > 0 && (
                        <Badge variant="outline" className="text-xs px-1.5">
                          <Scissors className="h-3 w-3 mr-0.5" />
                          {activity.proceduresCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {stats.recentActivity.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucune activité récente
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
