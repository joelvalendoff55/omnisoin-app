import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  RefreshCw,
  Lock,
  UserX,
  Database,
  TrendingUp,
  Clock,
  FileDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';
import {
  getSecurityStats,
  getRecentSecurityEvents,
  getRBACFieldAudit,
  getSecurityEventsTimeline,
  SecurityStats,
  SecurityEvent,
  RBACViolation,
  SecurityEventsByDay,
  FIELD_NAME_LABELS,
  ROLE_LABELS,
} from '@/lib/securityMonitoring';
import { exportSecurityDashboardToPdf } from '@/lib/securityPdf';
import SecurityEventsChart, { TimelinePeriod } from './SecurityEventsChart';
import { verifyHashChainIntegrity } from '@/lib/immutableAudit';
import NoAccessPage from '@/components/layout/NoAccessPage';

interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function SecurityMonitoringDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const { toast } = useToast();

  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [rbacAudit, setRbacAudit] = useState<RBACViolation[]>([]);
  const [timeline, setTimeline] = useState<SecurityEventsByDay[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hashCheckLoading, setHashCheckLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>(14);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const isAuthorized = isAdmin || isCoordinator;

  // Load user profiles
  const loadProfiles = useCallback(async (userIds: string[]) => {
    const validIds = userIds.filter(id => id && !profiles.has(id));
    if (validIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', validIds);

    if (data) {
      const newProfiles = new Map(profiles);
      data.forEach(p => newProfiles.set(p.user_id, p));
      setProfiles(newProfiles);
    }
  }, [profiles]);

  // Load all data
  const loadData = useCallback(async (showRefreshing = false, period: TimelinePeriod = timelinePeriod) => {
    if (!structureId || !isAuthorized) return;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsData, events, rbac, timelineData] = await Promise.all([
        getSecurityStats(structureId),
        getRecentSecurityEvents(structureId, 25),
        getRBACFieldAudit(structureId, 25),
        getSecurityEventsTimeline(structureId, period),
      ]);

      setStats(statsData);
      setSecurityEvents(events);
      setRbacAudit(rbac);
      setTimeline(timelineData);

      // Load profiles for users
      const userIds = [
        ...events.map(e => e.userId),
        ...rbac.map(r => r.attemptedBy),
      ].filter(Boolean) as string[];
      await loadProfiles(userIds);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [structureId, isAuthorized, loadProfiles, timelinePeriod]);

  // Load timeline only when period changes
  const loadTimeline = useCallback(async (period: TimelinePeriod) => {
    if (!structureId) return;
    
    setTimelineLoading(true);
    try {
      const timelineData = await getSecurityEventsTimeline(structureId, period);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setTimelineLoading(false);
    }
  }, [structureId]);

  // Handle period change
  const handlePeriodChange = useCallback((period: TimelinePeriod) => {
    setTimelinePeriod(period);
    loadTimeline(period);
  }, [loadTimeline]);

  // Verify hash chain
  const handleVerifyHashChain = async () => {
    if (!structureId) return;

    setHashCheckLoading(true);
    try {
      const result = await verifyHashChainIntegrity(structureId);
      setStats(prev => prev ? { ...prev, hashChainValid: result?.is_valid ?? null } : null);
    } catch (error) {
      console.error('Error verifying hash chain:', error);
    } finally {
      setHashCheckLoading(false);
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!stats) return;
    
    setExporting(true);
    try {
      // Get current user profile for report
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      // Get structure name
      const { data: structure } = await supabase
        .from('structures')
        .select('name')
        .eq('id', structureId)
        .single();

      // Enrich events with user names
      const eventsWithNames = securityEvents.map(e => ({
        ...e,
        userName: getUserName(e.userId),
      }));

      const violationsWithNames = rbacAudit.map(v => ({
        ...v,
        userName: getUserName(v.attemptedBy),
      }));

      exportSecurityDashboardToPdf({
        stats,
        events: eventsWithNames,
        rbacViolations: violationsWithNames,
        timeline,
        structureName: structure?.name,
        generatedBy: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : undefined,
      });

      toast({
        title: 'Export PDF généré',
        description: 'Le rapport de sécurité a été téléchargé.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Erreur d\'export',
        description: 'Impossible de générer le rapport PDF.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-check hash chain on load
  useEffect(() => {
    if (structureId && isAuthorized && !loading) {
      handleVerifyHashChain();
    }
  }, [structureId, isAuthorized, loading]);

  if (authLoading || roleLoading || structureLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <NoAccessPage />;
  }

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Système';
    const profile = profiles.get(userId);
    if (!profile) return 'Utilisateur';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur';
  };

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'security_event': return <ShieldAlert className="h-4 w-4" />;
      case 'data_modification': return <Database className="h-4 w-4" />;
      case 'export': return <Download className="h-4 w-4" />;
      case 'data_access': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Monitoring Sécurité</h1>
            <p className="text-muted-foreground">
              Surveillance en temps réel des événements de sécurité et RBAC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting || loading || !stats}
          >
            <FileDown className={`h-4 w-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Export...' : 'Export PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Hash Chain Status */}
      <Card className={stats?.hashChainValid === false ? 'border-destructive' : stats?.hashChainValid === true ? 'border-green-500' : ''}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {stats?.hashChainValid === null ? (
                <Lock className="h-6 w-6 text-muted-foreground" />
              ) : stats?.hashChainValid ? (
                <ShieldCheck className="h-6 w-6 text-green-500" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {stats?.hashChainValid === null
                    ? 'Vérification de l\'intégrité...'
                    : stats?.hashChainValid
                    ? 'Intégrité de la chaîne de hash vérifiée'
                    : 'ALERTE : Rupture de la chaîne de hash détectée'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Chaînage cryptographique SHA256 des logs d'audit
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyHashChain}
              disabled={hashCheckLoading}
            >
              {hashCheckLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Revérifier'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.totalAuditEvents}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total événements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold text-orange-600">{stats.securityEventsToday}</span>
              </div>
              <p className="text-sm text-muted-foreground">Sécurité aujourd'hui</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{stats.rbacViolations24h}</span>
              </div>
              <p className="text-sm text-muted-foreground">Modifs médicales 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">{stats.dataModifications7d}</span>
              </div>
              <p className="text-sm text-muted-foreground">Modifications 7j</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold text-purple-600">{stats.exportsToday}</span>
              </div>
              <p className="text-sm text-muted-foreground">Exports aujourd'hui</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline Chart */}
      <SecurityEventsChart 
        data={timeline} 
        loading={loading || timelineLoading} 
        period={timelinePeriod}
        onPeriodChange={handlePeriodChange}
      />

      {/* Events Tabs */}
      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Événements sécurité
          </TabsTrigger>
          <TabsTrigger value="rbac" className="gap-2">
            <Lock className="h-4 w-4" />
            Audit RBAC médical
          </TabsTrigger>
        </TabsList>

        {/* Security Events Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Événements de sécurité récents
              </CardTitle>
              <CardDescription>
                Actions sensibles, accès aux données et exports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : securityEvents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun événement de sécurité récent</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {securityEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${
                          event.eventType === 'security_event' ? 'bg-orange-100 text-orange-600' :
                          event.eventType === 'export' ? 'bg-purple-100 text-purple-600' :
                          event.eventType === 'data_access' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                            {event.resourceType && (
                              <Badge variant="outline">{event.resourceType}</Badge>
                            )}
                          </div>
                          <p className="font-medium truncate">{event.action}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{getUserName(event.userId)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(event.timestamp), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RBAC Audit Tab */}
        <TabsContent value="rbac">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Audit des modifications de champs médicaux
              </CardTitle>
              <CardDescription>
                Traçabilité des modifications sur les champs soumis au contrôle RBAC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : rbacAudit.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune modification de champ médical récente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rbacAudit.map((audit) => (
                      <div
                        key={audit.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={audit.isMedicalDecision ? 'destructive' : 'secondary'}>
                                {FIELD_NAME_LABELS[audit.fieldName] || audit.fieldName}
                              </Badge>
                              {audit.isMedicalDecision && (
                                <Badge variant="outline" className="border-red-500 text-red-600">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Décision médicale
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Ancienne valeur :</span>
                                <p className="font-mono text-xs bg-muted p-1 rounded mt-1 truncate">
                                  {audit.oldValue || '(vide)'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Nouvelle valeur :</span>
                                <p className="font-mono text-xs bg-muted p-1 rounded mt-1 truncate">
                                  {audit.newValue || '(vide)'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{getUserName(audit.attemptedBy)}</p>
                            <Badge variant="outline" className="mt-1">
                              {ROLE_LABELS[audit.attemptedByRole] || audit.attemptedByRole}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(audit.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
