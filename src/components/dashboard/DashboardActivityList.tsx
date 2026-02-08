import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Clock } from 'lucide-react';
import { useRecentActivity, getActionLabel } from '@/hooks/useRecentActivity';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardActivityList() {
  const { activities, loading } = useRecentActivity();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <div className="text-xs text-muted-foreground w-14 flex-shrink-0">
                  {format(new Date(activity.created_at), 'HH:mm', { locale: fr })}
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {getActionLabel(activity.action)}
                </Badge>
                {activity.patient_name && (
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {activity.patient_name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
