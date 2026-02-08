"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { History, Mail, MessageSquare, Search, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface NotificationLog {
  id: string;
  event_type: string;
  channel: 'email' | 'sms';
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  subject: string | null;
  message: string | null;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'bounced';
  error_message: string | null;
  sent_at: string;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  new_appointment: 'Nouveau RDV',
  cancel_appointment: 'Annulation RDV',
  no_show: 'Patient absent',
  urgent_alert: 'Alerte urgente',
  daily_summary: 'Résumé quotidien',
  reminder_24h: 'Rappel 24h',
  reminder_1h: 'Rappel 1h',
  test: 'Test',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'En attente', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  sent: { label: 'Envoyé', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  delivered: { label: 'Délivré', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: 'Échec', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  bounced: { label: 'Rebond', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

export function NotificationHistorySection() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as NotificationLog[]);
    } catch (err) {
      console.error('Error fetching notification logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notification_logs_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as NotificationLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelFilter, statusFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.recipient_name?.toLowerCase().includes(searchLower) ||
      log.recipient_email?.toLowerCase().includes(searchLower) ||
      log.recipient_phone?.includes(search) ||
      log.subject?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length,
    failed: logs.filter((l) => l.status === 'failed' || l.status === 'bounced').length,
    email: logs.filter((l) => l.channel === 'email').length,
    sms: logs.filter((l) => l.channel === 'sms').length,
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = ['Date', 'Canal', 'Événement', 'Destinataire', 'Email', 'Téléphone', 'Sujet', 'Statut', 'Erreur'];
    
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      log.channel.toUpperCase(),
      EVENT_LABELS[log.event_type] || log.event_type,
      log.recipient_name || '',
      log.recipient_email || '',
      log.recipient_phone || '',
      (log.subject || '').replace(/"/g, '""'),
      STATUS_CONFIG[log.status]?.label || log.status,
      (log.error_message || '').replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique-notifications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${filteredLogs.length} notifications exportées`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des notifications
            </CardTitle>
            <CardDescription>
              Consultez l'historique des notifications envoyées et leur statut de livraison
            </CardDescription>
          </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading || filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Envoyées</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-destructive/10">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Échecs</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <p className="text-2xl font-bold text-primary">{stats.email}</p>
            <p className="text-xs text-muted-foreground">Emails</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">{stats.sms}</p>
            <p className="text-xs text-muted-foreground">SMS</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par destinataire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les canaux</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="delivered">Délivré</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
              <SelectItem value="bounced">Rebond</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune notification trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {log.channel === 'email' ? (
                            <Mail className="h-4 w-4 text-primary" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-success" />
                          )}
                          <span className="text-sm capitalize">{log.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {EVENT_LABELS[log.event_type] || log.event_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {log.recipient_name && (
                            <span className="text-sm font-medium">{log.recipient_name}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {log.channel === 'email' ? log.recipient_email : log.recipient_phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
