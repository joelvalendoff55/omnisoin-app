"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { getUserDisplayName, getShortId } from '@/lib/users';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, ChevronDown, ChevronRight, Activity, ShieldAlert } from 'lucide-react';

interface ActivityLog {
  id: string;
  structure_id: string;
  actor_user_id: string;
  patient_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: {
    first_name: string | null;
    last_name: string | null;
  };
  patient?: {
    first_name: string;
    last_name: string;
  };
}

type PeriodFilter = '24h' | '7d' | '30d' | 'all';

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const loadLogs = useCallback(async () => {
    if (!structureId) return;

    try {
      setLoading(true);

      // Calculate date filter
      let dateFilter: string | null = null;
      const now = new Date();
      if (periodFilter === '24h') {
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (periodFilter === '7d') {
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (periodFilter === '30d') {
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('structure_id', structureId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Fetch actor profiles
      const actorIds = [...new Set((data || []).map((l) => l.actor_user_id))];
      const patientIds = [...new Set((data || []).filter((l) => l.patient_id).map((l) => l.patient_id as string))];

      const [profilesRes, patientsRes] = await Promise.all([
        actorIds.length > 0
          ? supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', actorIds)
          : Promise.resolve({ data: [] }),
        patientIds.length > 0
          ? supabase.from('patients').select('id, first_name, last_name').in('id', patientIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.user_id, p])
      );
      const patientMap = new Map(
        (patientsRes.data || []).map((p) => [p.id, p])
      );

      const enrichedLogs: ActivityLog[] = (data || []).map((log) => ({
        ...log,
        metadata: log.metadata as Record<string, unknown> | null,
        actor: profileMap.get(log.actor_user_id) || { first_name: null, last_name: null },
        patient: log.patient_id ? patientMap.get(log.patient_id) : undefined,
      }));

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId, periodFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && structureId) {
      loadLogs();
    }
  }, [user, structureId, loadLogs]);

  const toggleExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('CREATED')) return 'default';
    if (action.includes('UPDATED')) return 'secondary';
    if (action.includes('ARCHIVED') || action.includes('DELETED')) return 'destructive';
    return 'outline';
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      getUserDisplayName(log.actor?.first_name, log.actor?.last_name, log.actor_user_id)
        .toLowerCase()
        .includes(query) ||
      (log.patient &&
        `${log.patient.first_name} ${log.patient.last_name}`.toLowerCase().includes(query))
    );
  });

  const isLoading = authLoading || roleLoading || structureLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  if (!structureId) {
    return <NoAccessPage />;
  }

  // Access control: admin or coordinator only
  if (!isAdmin && !isCoordinator) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
          <p className="text-muted-foreground">
            Cette page est réservée aux administrateurs et coordinateurs.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Journal d'activité</h1>
          <p className="text-muted-foreground mt-1">
            Historique des actions sur la structure
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par action, utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernières 24h</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadLogs}>
            Actualiser
          </Button>
        </div>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activités ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 border rounded-lg">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-20 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune activité trouvée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id);
                  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                  return (
                    <Collapsible key={log.id} open={isExpanded}>
                      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {/* Timestamp */}
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </span>

                          {/* Actor */}
                          <span className="text-sm font-medium">
                            {getUserDisplayName(log.actor?.first_name, log.actor?.last_name, log.actor_user_id)}
                          </span>

                          {/* Action Badge */}
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>

                          {/* Patient */}
                          {log.patient && (
                            <span className="text-sm text-muted-foreground">
                              → {log.patient.first_name} {log.patient.last_name}
                            </span>
                          )}

                          {/* Expand button */}
                          {hasMetadata && (
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto"
                                onClick={() => toggleExpanded(log.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="ml-1 text-xs">Détails</span>
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>

                        <CollapsibleContent>
                          {hasMetadata && (
                            <pre className="mt-4 p-3 bg-muted rounded text-xs overflow-auto max-h-48">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
