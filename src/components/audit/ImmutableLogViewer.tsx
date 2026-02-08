import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Filter,
  AlertTriangle,
  Activity,
  FileText,
  Lock,
  Settings,
  User,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchImmutableAuditLogs, 
  verifyHashChainIntegrity, 
  getImmutableAuditStats,
  AuditEventType,
  ImmutableAuditLog,
  HashChainVerification,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS
} from '@/lib/immutableAudit';
import NoAccessPage from '@/components/layout/NoAccessPage';

const EVENT_ICONS: Record<AuditEventType, React.ReactNode> = {
  user_action: <User className="h-4 w-4" />,
  data_access: <FileText className="h-4 w-4" />,
  data_modification: <Activity className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  security_event: <Shield className="h-4 w-4" />,
  system_event: <Settings className="h-4 w-4" />,
};

interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function ImmutableLogViewer() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const { toast } = useToast();

  const [logs, setLogs] = useState<ImmutableAuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<{
    totalLogs: number;
    logsToday: number;
    logsLast7Days: number;
    securityEvents: number;
    exports: number;
  } | null>(null);
  const [hashVerification, setHashVerification] = useState<HashChainVerification | null>(null);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const pageSize = 50;

  const isAuthorized = isAdmin || isCoordinator;

  // Load user profiles
  const loadProfiles = useCallback(async (userIds: string[]) => {
    const missingIds = userIds.filter(id => id && !profiles.has(id));
    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', missingIds);

    if (data) {
      const newProfiles = new Map(profiles);
      data.forEach(p => newProfiles.set(p.user_id, p));
      setProfiles(newProfiles);
    }
  }, [profiles]);

  // Load data
  const loadData = useCallback(async () => {
    if (!structureId || !isAuthorized) return;

    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const { logs: fetchedLogs, count } = await fetchImmutableAuditLogs({
        limit: pageSize,
        offset,
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter as AuditEventType : undefined,
        resourceType: resourceTypeFilter || undefined,
      });

      setLogs(fetchedLogs);
      setTotalCount(count);

      // Load stats
      const fetchedStats = await getImmutableAuditStats(structureId);
      setStats(fetchedStats);

      // Load profiles
      const userIds = fetchedLogs.map(l => l.user_id).filter(Boolean) as string[];
      await loadProfiles(userIds);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les logs d\'audit.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [structureId, isAuthorized, currentPage, eventTypeFilter, resourceTypeFilter, toast, loadProfiles]);

  // Verify hash chain
  const handleVerifyHashChain = async () => {
    if (!structureId) return;

    setVerifying(true);
    try {
      const result = await verifyHashChainIntegrity(structureId);
      setHashVerification(result);

      if (result?.is_valid) {
        toast({
          title: 'Intégrité vérifiée',
          description: `${result.total_logs} logs vérifiés avec succès.`,
        });
      } else if (result && !result.is_valid) {
        toast({
          title: 'Intégrité compromise',
          description: 'Une rupture dans la chaîne de hash a été détectée.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying hash chain:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier l\'intégrité.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Export logs to CSV
  const handleExportLogs = async () => {
    try {
      const { logs: allLogs } = await fetchImmutableAuditLogs({
        limit: 10000,
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter as AuditEventType : undefined,
      });

      const csvContent = [
        ['Horodatage', 'Type', 'Utilisateur', 'Action', 'Ressource', 'Hash'].join(';'),
        ...allLogs.map(log => [
          format(new Date(log.log_timestamp), 'dd/MM/yyyy HH:mm:ss'),
          EVENT_TYPE_LABELS[log.event_type as AuditEventType] || log.event_type,
          profiles.get(log.user_id || '')?.first_name || 'Inconnu',
          log.action,
          log.resource_type || '-',
          log.hash_chain.substring(0, 16) + '...',
        ].join(';')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit_immuable_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      link.click();

      toast({
        title: 'Export réussi',
        description: `${allLogs.length} logs exportés.`,
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les logs.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Loading state
  if (authLoading || roleLoading || structureLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access control
  if (!user || !isAuthorized) {
    return <NoAccessPage />;
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lock className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Logs Immuables</h1>
            <p className="text-muted-foreground">
              Piste d'audit sécurisée avec chaînage cryptographique
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyHashChain}
            disabled={verifying}
          >
            {verifying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Vérifier intégrité
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Hash Chain Verification Alert */}
      {hashVerification && (
        <Card className={hashVerification.is_valid ? 'border-green-500' : 'border-destructive'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {hashVerification.is_valid ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Intégrité de la chaîne de hash vérifiée
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hashVerification.total_logs} logs analysés - Aucune falsification détectée
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">
                      ALERTE : Rupture de la chaîne de hash détectée
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Première rupture : {hashVerification.first_broken_at 
                        ? format(new Date(hashVerification.first_broken_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })
                        : 'Inconnue'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
              <p className="text-sm text-muted-foreground">Total logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">{stats.logsToday}</div>
              <p className="text-sm text-muted-foreground">Aujourd'hui</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">{stats.logsLast7Days}</div>
              <p className="text-sm text-muted-foreground">7 derniers jours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-destructive">{stats.securityEvents}</div>
              <p className="text-sm text-muted-foreground">Événements sécurité</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-purple-600">{stats.exports}</div>
              <p className="text-sm text-muted-foreground">Exports</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres :</span>
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type d'événement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Type de ressource..."
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Timeline des événements ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun log d'audit trouvé</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const profile = profiles.get(log.user_id || '');
                  const userName = profile 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur'
                    : 'Système';

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-2 rounded-full ${EVENT_TYPE_COLORS[log.event_type as AuditEventType] || 'bg-gray-100'}`}>
                        {EVENT_ICONS[log.event_type as AuditEventType]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={EVENT_TYPE_COLORS[log.event_type as AuditEventType]}>
                            {EVENT_TYPE_LABELS[log.event_type as AuditEventType]}
                          </Badge>
                          {log.resource_type && (
                            <Badge variant="secondary">{log.resource_type}</Badge>
                          )}
                        </div>
                        <p className="font-medium">{log.action}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.log_timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <code className="text-xs text-muted-foreground font-mono">
                          {log.hash_chain.substring(0, 12)}...
                        </code>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
