"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Activity, ChevronRight, FileText, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useStructureId } from '@/hooks/useStructureId';
import { fetchRecentCriticalAlerts, LabResult } from '@/lib/criticalLabAlerts';

interface CriticalLabAlert {
  documentId: string;
  patientId: string;
  patientName: string;
  results: LabResult[];
  documentTitle: string;
  createdAt: string;
}

function getStatusIcon(status?: string) {
  switch (status) {
    case 'critical':
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    case 'high':
      return <TrendingUp className="h-3.5 w-3.5 text-orange-500" />;
    case 'low':
      return <TrendingDown className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'critical':
      return <Badge variant="destructive" className="text-[10px] h-4 px-1">Critique</Badge>;
    case 'high':
      return <Badge className="text-[10px] h-4 px-1 bg-orange-500/10 text-orange-600 border-orange-500/20">Élevé</Badge>;
    case 'low':
      return <Badge className="text-[10px] h-4 px-1 bg-blue-500/10 text-blue-600 border-blue-500/20">Bas</Badge>;
    default:
      return null;
  }
}

export function CriticalLabAlertsWidget() {
  const { structureId } = useStructureId();
  const [alerts, setAlerts] = useState<CriticalLabAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!structureId) return;

    const loadAlerts = async () => {
      setLoading(true);
      try {
        const data = await fetchRecentCriticalAlerts(structureId, 5);
        setAlerts(data);
      } catch (err) {
        console.error('Failed to load critical lab alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [structureId]);

  const criticalCount = alerts.reduce(
    (count, alert) => count + alert.results.filter(r => r.status === 'critical').length,
    0
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(criticalCount > 0 && 'border-destructive/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className={cn("h-5 w-5", criticalCount > 0 ? "text-destructive animate-pulse" : "text-orange-500")} />
            Résultats biologiques anormaux
          </CardTitle>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun résultat anormal récent</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const hasCritical = alert.results.some(r => r.status === 'critical');

                return (
                  <div
                    key={`${alert.documentId}-${index}`}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      hasCritical
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <Link
                          to={`/patients/${alert.patientId}`}
                          className="font-medium text-sm hover:underline block truncate"
                        >
                          {alert.patientName}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{alert.documentTitle}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {alert.results.slice(0, 3).map((result, rIdx) => (
                        <div
                          key={rIdx}
                          className="flex items-center justify-between text-xs bg-background/60 rounded px-2 py-1"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getStatusIcon(result.status)}
                            <span className="font-medium truncate">{result.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">
                              {result.value}{result.unit ? ` ${result.unit}` : ''}
                            </span>
                            {getStatusBadge(result.status)}
                          </div>
                        </div>
                      ))}
                      {alert.results.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          +{alert.results.length - 3} autre{alert.results.length - 3 > 1 ? 's' : ''} résultat{alert.results.length - 3 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/patients/${alert.patientId}`}>
                          Voir le dossier
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
