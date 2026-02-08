import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Notification } from '@/lib/notifications';

interface AssistantAlertsWidgetProps {
  notifications: Notification[];
  loading: boolean;
}

const TYPE_CONFIG = {
  error: { icon: AlertTriangle, className: 'border-destructive/50 bg-destructive/5' },
  warning: { icon: AlertTriangle, className: 'border-warning/50 bg-warning/5' },
  queue: { icon: Bell, className: 'border-primary/50 bg-primary/5' },
  task: { icon: Bell, className: 'border-primary/50 bg-primary/5' },
} as const;

export function AssistantAlertsWidget({ notifications, loading }: AssistantAlertsWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertes urgentes
          </CardTitle>
          {notifications.length > 0 && (
            <Badge variant="destructive">{notifications.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Aucune alerte urgente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const config = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.task;
              const Icon = config.icon;

              return (
                <Link
                  key={notif.id}
                  to={notif.link || '#'}
                  className={`block p-3 rounded-lg border transition-colors hover:bg-accent/50 ${config.className}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-warning mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
