"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Eye, 
  FileText, 
  Trash2, 
  UserX, 
  Clock, 
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Activity,
  Lock,
  FileOutput
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { 
  fetchGdprAuditLogs, 
  getAuditStats,
  GdprAuditLog,
  AuditActionType,
  ACTION_TYPE_LABELS,
  TARGET_TYPE_LABELS,
  ACTION_TYPE_COLORS
} from '@/lib/gdprAudit';
import { toast } from 'sonner';

const ACTION_ICONS: Record<AuditActionType, React.ReactNode> = {
  vault_access: <Eye className="h-4 w-4" />,
  vault_create: <Lock className="h-4 w-4" />,
  vault_update: <FileText className="h-4 w-4" />,
  pseudonymization: <UserX className="h-4 w-4" />,
  data_export: <FileOutput className="h-4 w-4" />,
  deletion_request: <Trash2 className="h-4 w-4" />,
};

interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function GdprAuditPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();

  const [logs, setLogs] = useState<GdprAuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [stats, setStats] = useState({
    totalLogs: 0,
    vaultAccesses: 0,
    pseudonymizations: 0,
    exports: 0,
    deletionRequests: 0,
    last7Days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const pageSize = 20;

  const loadProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    const uniqueIds = [...new Set(userIds)];
    const missingIds = uniqueIds.filter(id => !profiles.has(id));
    
    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', missingIds);

    if (data) {
      const newProfiles = new Map(profiles);
      data.forEach(profile => {
        newProfiles.set(profile.user_id, profile);
      });
      setProfiles(newProfiles);
    }
  }, [profiles]);

  const loadData = useCallback(async () => {
    if (!structureId) return;

    setLoading(true);
    try {
      const [logsResult, statsResult] = await Promise.all([
        fetchGdprAuditLogs(structureId, {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          actionType: filterAction !== 'all' ? filterAction as AuditActionType : undefined,
          startDate: filterDateStart || undefined,
          endDate: filterDateEnd || undefined,
        }),
        getAuditStats(structureId),
      ]);

      setLogs(logsResult.logs);
      setTotalCount(logsResult.count);
      setStats(statsResult);

      // Load profiles for actors
      const actorIds = logsResult.logs.map(log => log.actor_user_id);
      await loadProfiles(actorIds);
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Erreur lors du chargement des données d\'audit');
    } finally {
      setLoading(false);
    }
  }, [structureId, currentPage, filterAction, filterDateStart, filterDateEnd, loadProfiles]);

  useEffect(() => {
    if (structureId && (isAdmin || isCoordinator)) {
      loadData();
    }
  }, [structureId, isAdmin, isCoordinator, loadData]);

  const getActorName = (userId: string): string => {
    const profile = profiles.get(userId);
    if (!profile) return 'Utilisateur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Sans nom';
  };

  const handleExportLogs = async () => {
    if (!structureId) return;

    try {
      const { logs: allLogs } = await fetchGdprAuditLogs(structureId, {
        limit: 10000,
        actionType: filterAction !== 'all' ? filterAction as AuditActionType : undefined,
        startDate: filterDateStart || undefined,
        endDate: filterDateEnd || undefined,
      });

      const csvContent = [
        ['Date', 'Action', 'Cible', 'Acteur', 'Détails'].join(';'),
        ...allLogs.map(log => [
          format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
          ACTION_TYPE_LABELS[log.action_type as AuditActionType] || log.action_type,
          TARGET_TYPE_LABELS[log.target_type as keyof typeof TARGET_TYPE_LABELS] || log.target_type,
          getActorName(log.actor_user_id),
          JSON.stringify(log.details),
        ].join(';')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-rgpd-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Export CSV généré');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const isPageLoading = authLoading || roleLoading || structureLoading;

  if (isPageLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !isCoordinator) {
    return <NoAccessPage />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Audit RGPD
            </h1>
            <p className="text-muted-foreground mt-1">
              Traçabilité des accès au coffre-fort et opérations de pseudonymisation
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="outline" onClick={handleExportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalLogs}</p>
                  <p className="text-xs text-muted-foreground">Total logs</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.vaultAccesses}</p>
                  <p className="text-xs text-muted-foreground">Accès coffre</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.pseudonymizations}</p>
                  <p className="text-xs text-muted-foreground">Pseudonymisations</p>
                </div>
                <UserX className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-orange-600">{stats.exports}</p>
                  <p className="text-xs text-muted-foreground">Exports</p>
                </div>
                <FileOutput className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.deletionRequests}</p>
                  <p className="text-xs text-muted-foreground">Suppressions</p>
                </div>
                <Trash2 className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.last7Days}</p>
                  <p className="text-xs text-muted-foreground">7 derniers jours</p>
                </div>
                <Clock className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Label className="text-sm">Type d'action</Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="vault_access">Accès coffre-fort</SelectItem>
                    <SelectItem value="vault_create">Création identité</SelectItem>
                    <SelectItem value="vault_update">Modification identité</SelectItem>
                    <SelectItem value="pseudonymization">Pseudonymisation</SelectItem>
                    <SelectItem value="data_export">Export de données</SelectItem>
                    <SelectItem value="deletion_request">Demande suppression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="text-sm">Date début</Label>
                <Input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label className="text-sm">Date fin</Label>
                <Input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setFilterAction('all');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                    setCurrentPage(1);
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Journal d'audit</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalCount} entrée(s)
              </span>
            </CardTitle>
            <CardDescription>
              Historique complet des accès et opérations RGPD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date</TableHead>
                    <TableHead className="w-[180px]">Action</TableHead>
                    <TableHead className="w-[120px]">Cible</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <div className="h-8 bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune entrée d'audit trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={`gap-1 ${ACTION_TYPE_COLORS[log.action_type as AuditActionType] || ''}`}
                          >
                            {ACTION_ICONS[log.action_type as AuditActionType]}
                            {ACTION_TYPE_LABELS[log.action_type as AuditActionType] || log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {TARGET_TYPE_LABELS[log.target_type as keyof typeof TARGET_TYPE_LABELS] || log.target_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getActorName(log.actor_user_id)}</span>
                        </TableCell>
                        <TableCell>
                          {Object.keys(log.details || {}).length > 0 ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {JSON.stringify(log.details).substring(0, 50)}
                              {JSON.stringify(log.details).length > 50 && '...'}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
