import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Users, Monitor, TrendingUp, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { ACIIndicator } from '@/hooks/useACIIndicators';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatACIReport } from '@/lib/coordinateurFormatter';

const categoryConfig = {
  acces_soins: { label: 'Accès aux soins', icon: Target, color: 'text-blue-600' },
  travail_equipe: { label: 'Travail en équipe', icon: Users, color: 'text-green-600' },
  systeme_info: { label: "Système d'information", icon: Monitor, color: 'text-purple-600' },
};

const statusConfig = {
  on_track: { label: 'En bonne voie', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  at_risk: { label: 'Attention', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  late: { label: 'En retard', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

interface IndicatorGaugeProps {
  indicator: ACIIndicator;
}

function IndicatorGauge({ indicator }: IndicatorGaugeProps) {
  const progress = Math.min((indicator.current_value / indicator.target_value) * 100, 100);
  const config = statusConfig[indicator.status];

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium truncate">{indicator.name}</p>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-3 flex-1" />
          <span className="text-sm font-bold min-w-[60px] text-right">
            {Math.round(progress)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {indicator.current_value}/{indicator.target_value} {indicator.unit}
        </p>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: keyof typeof categoryConfig;
  indicators: ACIIndicator[];
}

function CategoryCard({ category, indicators }: CategoryCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  const categoryIndicators = indicators.filter(i => i.category === category);
  
  if (categoryIndicators.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle className="text-lg">{config.label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun indicateur configuré
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalProgress = categoryIndicators.reduce((acc, i) => acc + (i.current_value / i.target_value) * 100, 0) / categoryIndicators.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle className="text-lg">{config.label}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">{Math.round(totalProgress)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoryIndicators.map(indicator => (
          <IndicatorGauge key={indicator.id} indicator={indicator} />
        ))}
      </CardContent>
    </Card>
  );
}

interface AlertsSummaryProps {
  indicators: ACIIndicator[];
}

function AlertsSummary({ indicators }: AlertsSummaryProps) {
  const alertIndicators = indicators.filter(i => i.status === 'late' || i.status === 'at_risk');
  
  if (alertIndicators.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium text-green-700 dark:text-green-400">
          Tous les indicateurs sont en bonne voie
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
          {alertIndicators.length} indicateur(s) nécessitant une attention
        </span>
      </div>
      <div className="space-y-2">
        {alertIndicators.map(indicator => {
          const progress = Math.round((indicator.current_value / indicator.target_value) * 100);
          const status = statusConfig[indicator.status];
          
          return (
            <div key={indicator.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{indicator.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{progress}%</span>
                <Badge className={status.color} variant="secondary">{status.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ACIDashboardSectionProps {
  indicators: ACIIndicator[];
  loading: boolean;
  structureName?: string;
}

export function ACIDashboardSection({ indicators, loading, structureName }: ACIDashboardSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate global stats
  const onTrack = indicators.filter(i => i.status === 'on_track').length;
  const atRisk = indicators.filter(i => i.status === 'at_risk').length;
  const late = indicators.filter(i => i.status === 'late').length;
  const globalProgress = indicators.length > 0
    ? Math.round(indicators.reduce((acc, i) => acc + (i.current_value / i.target_value) * 100, 0) / indicators.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Copy Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tableau de bord ACI / ROSP</h2>
          <p className="text-sm text-muted-foreground">
            Suivi en temps réel des indicateurs de performance
          </p>
        </div>
        <CopyToClipboard
          text={formatACIReport(indicators, structureName)}
          label="Copier rapport ACI"
          variant="outline"
          icon={<Copy className="h-4 w-4" />}
        />
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progression globale</p>
                <p className="text-3xl font-bold">{globalProgress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En bonne voie</p>
                <p className="text-3xl font-bold text-green-600">{onTrack}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attention</p>
                <p className="text-3xl font-bold text-yellow-600">{atRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-3xl font-bold text-red-600">{late}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Summary */}
      <AlertsSummary indicators={indicators} />

      {/* Category Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CategoryCard category="acces_soins" indicators={indicators} />
        <CategoryCard category="travail_equipe" indicators={indicators} />
        <CategoryCard category="systeme_info" indicators={indicators} />
      </div>
    </div>
  );
}
