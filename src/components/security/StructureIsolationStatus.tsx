import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataAccess } from '@/hooks/useDataAccess';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  healthy: {
    icon: ShieldCheck,
    label: 'Sécurisé',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Aucune tentative d\'accès cross-structure détectée',
  },
  attention: {
    icon: ShieldAlert,
    label: 'Attention',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Des alertes récentes ont été détectées mais résolues',
  },
  warning: {
    icon: ShieldX,
    label: 'Alerte',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    description: 'Des alertes non résolues nécessitent votre attention',
  },
};

export function StructureIsolationStatus() {
  const { 
    isolationStatus, 
    isolationStatusLoading, 
    alerts, 
    alertsLoading, 
    resolveAlert 
  } = useDataAccess();

  const status = isolationStatus?.status || 'healthy';
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId);
  };

  if (isolationStatusLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview Card */}
      <Card className={cn('border-2', config.borderColor)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            {/* Status Icon */}
            <div className={cn(
              'flex items-center justify-center h-16 w-16 rounded-full',
              config.bgColor
            )}>
              <StatusIcon className={cn('h-8 w-8', config.color)} />
            </div>

            {/* Status Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={cn('text-xl font-semibold', config.color)}>
                  {config.label}
                </h3>
                <Badge variant="outline" className={config.color}>
                  Multi-tenant
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {config.description}
              </p>
              {isolationStatus?.last_checked && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Dernière vérification : {format(new Date(isolationStatus.last_checked), 'dd MMM yyyy HH:mm', { locale: fr })}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{isolationStatus?.total_alerts ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total alertes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {isolationStatus?.recent_alerts_24h ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">24h</p>
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  (isolationStatus?.unresolved_alerts ?? 0) > 0 ? 'text-destructive' : 'text-green-600'
                )}>
                  {isolationStatus?.unresolved_alerts ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Non résolues</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isolationStatus && isolationStatus.total_alerts > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Taux de résolution</span>
                <span className="font-medium">
                  {Math.round(((isolationStatus.total_alerts - isolationStatus.unresolved_alerts) / isolationStatus.total_alerts) * 100)}%
                </span>
              </div>
              <Progress 
                value={((isolationStatus.total_alerts - isolationStatus.unresolved_alerts) / isolationStatus.total_alerts) * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unresolved Alerts */}
      {unresolvedAlerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertes non résolues ({unresolvedAlerts.length})
            </CardTitle>
            <CardDescription>
              Ces tentatives d'accès cross-structure nécessitent une vérification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {unresolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5"
                  >
                    <ShieldX className="h-5 w-5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {alert.severity}
                        </Badge>
                        <span className="text-sm font-medium">
                          {alert.resource_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tentative d'accès à la structure {alert.target_structure_id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(alert.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(alert.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Résoudre
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Resolved Alerts History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Historique des alertes
          </CardTitle>
          <CardDescription>
            Alertes résolues et archivées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : resolvedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="h-12 w-12 text-green-500/30 mb-4" />
              <p className="text-muted-foreground">Aucune alerte dans l'historique</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {resolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 p-4 border rounded-lg opacity-60"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Résolu
                        </Badge>
                        <span className="text-sm">
                          {alert.resource_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Résolu le {alert.resolved_at && format(new Date(alert.resolved_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
