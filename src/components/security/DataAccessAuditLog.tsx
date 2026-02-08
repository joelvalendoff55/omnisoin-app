import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Eye,
  Lock,
  Download,
  Printer,
  Search,
  Filter,
  FileDown,
  Clock,
  User,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataAccess } from '@/hooks/useDataAccess';
import { DataAccessAction, ACCESS_REASON_CATEGORIES } from '@/lib/dataAccess';
import { cn } from '@/lib/utils';

const ACTION_ICONS: Record<DataAccessAction, React.ReactNode> = {
  read: <Eye className="h-4 w-4" />,
  decrypt: <Lock className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  print: <Printer className="h-4 w-4" />,
};

const ACTION_LABELS: Record<DataAccessAction, string> = {
  read: 'Lecture',
  decrypt: 'Déchiffrement',
  export: 'Export',
  print: 'Impression',
};

const ACTION_COLORS: Record<DataAccessAction, string> = {
  read: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  decrypt: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  export: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  print: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export function DataAccessAuditLog() {
  const { logs, logsCount, logsLoading, stats, statsLoading } = useDataAccess();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.access_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.fields_accessed.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = filterAction === 'all' || log.action_type === filterAction;
    
    return matchesSearch && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Action', 'Ressource', 'Champs', 'Motif', 'Catégorie', 'IP'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.accessed_at), 'yyyy-MM-dd HH:mm:ss'),
      log.user_id,
      log.action_type,
      `${log.resource_type}:${log.resource_id}`,
      log.fields_accessed.join(';'),
      log.access_reason,
      log.access_reason_category,
      log.ip_address || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-acces-donnees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total accès</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.totalAccesses ?? 0}</p>
                )}
              </div>
              <Database className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.accessesToday ?? 0}</p>
                )}
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">7 derniers jours</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.accessesLast7Days ?? 0}</p>
                )}
              </div>
              <Eye className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Déchiffrements</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">{stats?.decryptions ?? 0}</p>
                )}
              </div>
              <Lock className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exports</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-purple-600">{stats?.exports ?? 0}</p>
                )}
              </div>
              <Download className="h-8 w-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Journal d'accès aux données
              </CardTitle>
              <CardDescription>
                {logsCount} accès enregistrés • Conformité RGPD
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par ressource, champ ou motif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type d'action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="read">Lecture</SelectItem>
                <SelectItem value="decrypt">Déchiffrement</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="print">Impression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          <ScrollArea className="h-[500px]">
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Aucun accès enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Action Icon */}
                    <div className={cn(
                      'flex items-center justify-center h-10 w-10 rounded-full',
                      ACTION_COLORS[log.action_type]
                    )}>
                      {ACTION_ICONS[log.action_type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.resource_type}
                        </Badge>
                        <span className="text-sm font-medium">
                          {ACTION_LABELS[log.action_type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {log.fields_accessed.join(', ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {log.access_reason}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_id.slice(0, 8)}...
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.accessed_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </span>
                        {log.ip_address && (
                          <span className="font-mono">{log.ip_address}</span>
                        )}
                      </div>
                    </div>

                    {/* Category Badge */}
                    <Badge variant="secondary" className="shrink-0">
                      {ACCESS_REASON_CATEGORIES.find(c => c.value === log.access_reason_category)?.label || log.access_reason_category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
