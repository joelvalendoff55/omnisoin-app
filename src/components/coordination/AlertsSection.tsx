import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ACIIndicator } from '@/hooks/useACIIndicators';

const categoryConfig = {
  acces_soins: { label: 'Accès aux soins' },
  travail_equipe: { label: 'Travail en équipe' },
  systeme_info: { label: "Système d'information" },
};

const statusConfig = {
  on_track: { label: 'En bonne voie', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  at_risk: { label: 'Attention', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  late: { label: 'En retard', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

interface AlertsSectionProps {
  indicators: ACIIndicator[];
  loading: boolean;
}

export function AlertsSection({ indicators, loading }: AlertsSectionProps) {
  const alertIndicators = indicators.filter(i => i.status === 'late' || i.status === 'at_risk');

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Alertes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Alertes</CardTitle>
        </div>
        <CardDescription>Indicateurs nécessitant une attention particulière</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alertIndicators.map(indicator => {
            const category = categoryConfig[indicator.category];
            const status = statusConfig[indicator.status];
            const progress = Math.round((indicator.current_value / indicator.target_value) * 100);

            return (
              <div key={indicator.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  {indicator.status === 'late' ? (
                    <Clock className="h-5 w-5 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">{indicator.name}</p>
                    <p className="text-sm text-muted-foreground">{category.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{progress}%</span>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
              </div>
            );
          })}
          {alertIndicators.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Tous les indicateurs sont en bonne voie</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
