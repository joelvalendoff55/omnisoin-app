import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, User, Users, Calendar, CheckCircle, XCircle, UserX, Phone, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getActionLabel, type RecentActivityItem } from '@/lib/dashboardStats';

interface RecentActivityProps {
  activities: RecentActivityItem[];
  loading: boolean;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  PATIENT_CREATED: Users,
  PATIENT_UPDATED: User,
  queue_present: Clock,
  queue_arrival: Clock,
  queue_called: Phone,
  queue_in_consultation: Activity,
  queue_completed: CheckCircle,
  queue_closed: CheckCircle,
  queue_cancelled: XCircle,
  queue_no_show: UserX,
  team_member_created: Users,
};

const ACTION_COLORS: Record<string, string> = {
  queue_completed: 'text-green-600',
  queue_closed: 'text-slate-600',
  queue_cancelled: 'text-gray-500',
  queue_no_show: 'text-red-500',
  queue_called: 'text-blue-600',
  queue_in_consultation: 'text-purple-600',
  PATIENT_CREATED: 'text-primary',
};

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <Card data-testid="dashboard-recent-activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activité récente
          </CardTitle>
          <CardDescription>Dernières actions sur la plateforme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="dashboard-recent-activity">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activité récente
        </CardTitle>
        <CardDescription>Dernières actions sur la plateforme</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {activities.map(activity => {
                const Icon = ACTION_ICONS[activity.action] || Activity;
                const colorClass = ACTION_COLORS[activity.action] || 'text-muted-foreground';
                const initials = activity.actor_name
                  ? activity.actor_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : '?';

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3"
                    data-testid="activity-item"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-muted">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${colorClass}`} />
                        <span className="text-sm font-medium truncate">
                          {getActionLabel(activity.action)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {activity.actor_name && (
                          <span className="truncate">{activity.actor_name}</span>
                        )}
                        {activity.patient_name && (
                          <>
                            <span>·</span>
                            <span className="truncate">{activity.patient_name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
