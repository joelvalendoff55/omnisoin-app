import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Shield,
  Link,
  Lock,
  FileText,
  CheckCircle,
  Key,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import {
  fetchLatestHealthChecks,
  runHealthCheck,
  runAllHealthChecks,
  HEALTH_CHECK_INFO,
  getStatusColor,
  type HealthCheckType,
  type HealthCheck,
} from '@/lib/systemHealth';
import { useStructureId } from '@/hooks/useStructureId';

const ICONS: Record<string, React.ElementType> = {
  Shield,
  Link,
  Lock,
  FileText,
  CheckCircle,
  Key,
};

interface HealthCheckCardProps {
  type: HealthCheckType;
  check: HealthCheck | null;
  onRun: () => void;
  isRunning: boolean;
}

function HealthCheckCard({ type, check, onRun, isRunning }: HealthCheckCardProps) {
  const info = HEALTH_CHECK_INFO[type];
  const Icon = ICONS[info.icon] || Shield;
  
  const statusIcon = {
    passed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    failed: <XCircle className="h-5 w-5 text-red-600" />,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{info.label}</CardTitle>
          </div>
          {check?.status && statusIcon[check.status]}
        </div>
        <CardDescription className="text-sm">{info.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {check ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(check.status)}>
                {check.status === 'passed' ? 'Réussi' : 
                 check.status === 'warning' ? 'Attention' : 'Échoué'}
              </Badge>
              {check.duration_ms && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {check.duration_ms}ms
                </span>
              )}
            </div>
            
            {check.details && (
              <div className="text-xs bg-muted p-2 rounded max-h-24 overflow-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(check.details, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {format(new Date(check.check_timestamp), 'dd MMM yyyy HH:mm', { locale: fr })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRun}
                disabled={isRunning}
              >
                {isRunning ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
                <span className="ml-1">Relancer</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">Jamais exécuté</p>
            <Button variant="outline" size="sm" onClick={onRun} disabled={isRunning}>
              {isRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Lancer le check
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SystemHealthDashboard() {
  const { structureId } = useStructureId();
  const queryClient = useQueryClient();
  const [runningCheck, setRunningCheck] = useState<HealthCheckType | 'all' | null>(null);

  const { data: latestChecks, isLoading } = useQuery({
    queryKey: ['health-checks', structureId],
    queryFn: () => fetchLatestHealthChecks(structureId!),
    enabled: !!structureId,
    refetchInterval: 30000,
  });

  const runCheckMutation = useMutation({
    mutationFn: async (checkType: HealthCheckType) => {
      setRunningCheck(checkType);
      return runHealthCheck(checkType, structureId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-checks'] });
      toast.success('Check exécuté avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
    onSettled: () => {
      setRunningCheck(null);
    },
  });

  const runAllMutation = useMutation({
    mutationFn: async () => {
      setRunningCheck('all');
      return runAllHealthChecks(structureId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-checks'] });
      toast.success('Tous les checks ont été exécutés');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
    onSettled: () => {
      setRunningCheck(null);
    },
  });

  if (!structureId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune structure associée
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const checkTypes: HealthCheckType[] = [
    'rls_integrity',
    'hash_chain_integrity',
    'rbac_enforcement',
    'audit_completeness',
    'consent_coverage',
    'data_encryption',
  ];

  const passedCount = checkTypes.filter(
    (type) => latestChecks?.[type]?.status === 'passed'
  ).length;
  const totalChecks = checkTypes.filter((type) => latestChecks?.[type]).length;
  const progressPercent = totalChecks > 0 ? (passedCount / checkTypes.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                État de Santé du Système
              </CardTitle>
              <CardDescription>
                {passedCount}/{checkTypes.length} vérifications réussies
              </CardDescription>
            </div>
            <Button
              onClick={() => runAllMutation.mutate()}
              disabled={runningCheck === 'all'}
            >
              {runningCheck === 'all' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Exécuter tous les checks
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Score de conformité</span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Health Check Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {checkTypes.map((type) => (
          <HealthCheckCard
            key={type}
            type={type}
            check={latestChecks?.[type] || null}
            onRun={() => runCheckMutation.mutate(type)}
            isRunning={runningCheck === type}
          />
        ))}
      </div>
    </div>
  );
}
