import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Users, Monitor, TrendingUp } from 'lucide-react';
import { ACIIndicator } from '@/hooks/useACIIndicators';

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

interface IndicatorCardProps {
  indicator: ACIIndicator;
}

function IndicatorCard({ indicator }: IndicatorCardProps) {
  const progress = Math.min((indicator.current_value / indicator.target_value) * 100, 100);
  const config = statusConfig[indicator.status];

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium truncate">{indicator.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {indicator.current_value}/{indicator.target_value} {indicator.unit}
          </span>
        </div>
      </div>
      <Badge className={config.color}>{config.label}</Badge>
    </div>
  );
}

interface CategorySectionProps {
  category: keyof typeof categoryConfig;
  indicators: ACIIndicator[];
}

function CategorySection({ category, indicators }: CategorySectionProps) {
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
            <span className="text-sm font-medium">{Math.round(totalProgress)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoryIndicators.map(indicator => (
          <IndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </CardContent>
    </Card>
  );
}

interface ACIIndicatorsSectionProps {
  indicators: ACIIndicator[];
  loading: boolean;
}

export function ACIIndicatorsSection({ indicators, loading }: ACIIndicatorsSectionProps) {
  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Indicateurs ACI</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Indicateurs ACI</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CategorySection category="acces_soins" indicators={indicators} />
        <CategorySection category="travail_equipe" indicators={indicators} />
        <CategorySection category="systeme_info" indicators={indicators} />
      </div>
    </div>
  );
}
