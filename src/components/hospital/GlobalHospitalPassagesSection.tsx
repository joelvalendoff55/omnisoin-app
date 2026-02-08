import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  AlertTriangle,
  RefreshCw,
  Bell,
  Calendar,
  User,
  ChevronRight,
  FileText,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAllHospitalPassages } from '@/hooks/useAllHospitalPassages';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import {
  formatHospitalPassageForCopy,
  formatHospitalPassagesReport,
  calculatePassageStats,
} from '@/lib/hospitalFormatter';
import {
  PASSAGE_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '@/lib/hospitalPassages';

type PeriodFilter = '24h' | '7d' | '30d' | 'all';
type RiskFilter = 'eleve' | 'modere' | 'standard' | 'all';

export default function GlobalHospitalPassagesSection() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  const { passages, loading, reload, newPassagesCount } = useAllHospitalPassages({
    period,
    riskLevel: riskFilter,
    limit: 100,
  });

  const stats = calculatePassageStats(passages);

  const handleViewPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Flux Hospitaliers
              {newPassagesCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <Bell className="h-3 w-3" />
                  {newPassagesCount} nouveau{newPassagesCount > 1 ? 'x' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Passages aux urgences et hospitalisations de vos patients
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <CopyToClipboard
              text={formatHospitalPassagesReport(passages)}
              label="Exporter"
              variant="outline"
              size="sm"
              icon={<FileText className="h-4 w-4" />}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total passages</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.urgences}</p>
            <p className="text-xs text-muted-foreground">Urgences</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.hospitalisations}</p>
            <p className="text-xs text-muted-foreground">Hospitalisations</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pendingTasks}</p>
            <p className="text-xs text-muted-foreground">Tâches en attente</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7 jours</TabsTrigger>
              <TabsTrigger value="30d">30 jours</TabsTrigger>
              <TabsTrigger value="all">Tout</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Risque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="eleve">Risque élevé</SelectItem>
              <SelectItem value="modere">Risque modéré</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Passages List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : passages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucun passage sur cette période</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {passages.map((passage) => {
                const isNew = new Date(passage.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
                
                return (
                  <div
                    key={passage.id}
                    className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                      isNew ? 'border-l-4 border-l-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleViewPatient(passage.patient_id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isNew && (
                            <Badge variant="default" className="text-xs">
                              Nouveau
                            </Badge>
                          )}
                          <Badge className={RISK_LEVEL_COLORS[passage.risk_level]}>
                            {RISK_LEVEL_LABELS[passage.risk_level]}
                          </Badge>
                          <Badge variant="outline">
                            {PASSAGE_TYPE_LABELS[passage.passage_type]}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{passage.patient_name}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {passage.etablissement}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(passage.passage_date), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                        
                        {passage.motif && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {passage.motif}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <CopyToClipboard
                          text={formatHospitalPassageForCopy(passage, passage.patient_name)}
                          size="icon"
                          variant="ghost"
                          label="Copier passage"
                        />
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* High Risk Alert */}
        {stats.highRisk > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {stats.highRisk} passage(s) à risque élevé
              </p>
              <p className="text-xs text-red-600/80">
                Nécessitent une attention particulière
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
