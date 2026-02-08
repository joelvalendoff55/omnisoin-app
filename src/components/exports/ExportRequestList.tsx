import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileDown,
  RefreshCw,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Plus,
  FileText,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { ExportRequestForm } from './ExportRequestForm';
import {
  fetchExportRequests,
  getExportStats,
  ExportRequest,
  ExportStatus,
  ExportType,
  EXPORT_TYPE_LABELS,
  EXPORT_STATUS_LABELS,
  EXPORT_STATUS_COLORS,
  EXPORT_FORMAT_LABELS,
} from '@/lib/exports';
import { supabase } from '@/integrations/supabase/client';

const STATUS_ICONS: Record<ExportStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  expired: <AlertTriangle className="h-4 w-4" />,
};

interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function ExportRequestList() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const { toast } = useToast();

  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<{
    totalExports: number;
    pendingExports: number;
    completedExports: number;
    failedExports: number;
    rgpdExports: number;
    hasExports: number;
  } | null>(null);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const pageSize = 20;

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
    if (!structureId) return;

    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const { requests: fetchedRequests, count } = await fetchExportRequests({
        limit: pageSize,
        offset,
        status: statusFilter !== 'all' ? statusFilter as ExportStatus : undefined,
        exportType: typeFilter !== 'all' ? typeFilter as ExportType : undefined,
      });

      setRequests(fetchedRequests);
      setTotalCount(count);

      // Load stats
      const fetchedStats = await getExportStats(structureId);
      setStats(fetchedStats);

      // Load profiles
      const userIds = fetchedRequests.map(r => r.requester_id).filter(Boolean);
      await loadProfiles(userIds);
    } catch (error) {
      console.error('Error loading export requests:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes d\'export.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [structureId, currentPage, statusFilter, typeFilter, toast, loadProfiles]);

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
          <FileDown className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Demandes d'export</h1>
            <p className="text-muted-foreground">
              Exports RGPD et conformité HAS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNewRequestForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">{stats.totalExports}</div>
              <p className="text-sm text-muted-foreground">Total exports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingExports}</div>
              <p className="text-sm text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-green-600">{stats.completedExports}</div>
              <p className="text-sm text-muted-foreground">Terminés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-destructive">{stats.failedExports}</div>
              <p className="text-sm text-muted-foreground">Échecs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-blue-600">{stats.rgpdExports}</div>
              <p className="text-sm text-muted-foreground">Exports RGPD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-purple-600">{stats.hasExports}</div>
              <p className="text-sm text-muted-foreground">Exports HAS</p>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(EXPORT_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Type d'export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(EXPORT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demandes d'export ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune demande d'export</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowNewRequestForm(true)}
                >
                  Créer une demande
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const profile = profiles.get(request.requester_id);
                  const requesterName = profile 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur'
                    : 'Inconnu';

                  return (
                    <div
                      key={request.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-2 rounded-full ${EXPORT_STATUS_COLORS[request.status]}`}>
                        {STATUS_ICONS[request.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline">
                            {EXPORT_TYPE_LABELS[request.export_type]}
                          </Badge>
                          <Badge variant="secondary">
                            {EXPORT_FORMAT_LABELS[request.export_format]}
                          </Badge>
                          <Badge className={EXPORT_STATUS_COLORS[request.status]}>
                            {EXPORT_STATUS_LABELS[request.status]}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{request.justification}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Par : {requesterName}</span>
                          <span>
                            {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                          {request.expiration_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expire : {format(new Date(request.expiration_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Shield className="h-3 w-3 inline mr-1" />
                          {request.legal_basis}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {request.status === 'completed' && request.file_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={request.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        )}
                        {request.file_hash && (
                          <code className="text-xs text-muted-foreground font-mono">
                            SHA256: {request.file_hash.substring(0, 12)}...
                          </code>
                        )}
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

      {/* New Request Dialog */}
      <ExportRequestForm
        open={showNewRequestForm}
        onOpenChange={setShowNewRequestForm}
        onSuccess={loadData}
      />
    </div>
  );
}
