"use client";

import { useMemo } from 'react';
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, AlertTriangle, Calendar, MessageSquare, X, Clock, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface DashboardAlert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  category: 'wait_time' | 'cancellation' | 'message' | 'reminder' | 'no_show';
  title: string;
  description: string;
  timestamp: Date;
  actionLabel?: string;
  actionHref?: string;
  patientId?: string;
  patientName?: string;
}

interface DashboardAlertsWidgetProps {
  alerts: DashboardAlert[];
  loading?: boolean;
  onDismiss?: (id: string) => void;
}

export default function DashboardAlertsWidget({
  alerts,
  loading,
  onDismiss,
}: DashboardAlertsWidgetProps) {
  const router = useRouter();

  const sortedAlerts = useMemo(() => {
    const priorityOrder = { urgent: 0, warning: 1, info: 2 };
    return [...alerts].sort((a, b) => 
      priorityOrder[a.type] - priorityOrder[b.type] || 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [alerts]);

  const urgentCount = alerts.filter((a) => a.type === 'urgent').length;

  const getIcon = (category: DashboardAlert['category']) => {
    switch (category) {
      case 'wait_time':
        return <Clock className="h-4 w-4" />;
      case 'cancellation':
        return <X className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      case 'no_show':
        return <UserX className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeStyles = (type: DashboardAlert['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  const getIconStyles = (type: DashboardAlert['type']) => {
    switch (type) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alertes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(urgentCount > 0 && 'border-red-300 dark:border-red-700')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className={cn('h-5 w-5', urgentCount > 0 && 'text-red-500 animate-pulse')} />
            Alertes
            {urgentCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune alerte</p>
          </div>
        ) : (
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {sortedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    getTypeStyles(alert.type)
                  )}
                >
                  <div className={cn('mt-0.5', getIconStyles(alert.type))}>
                    {getIcon(alert.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.description}
                        </p>
                        {alert.patientName && (
                          <p className="text-xs text-primary mt-1">
                            Patient: {alert.patientName}
                          </p>
                        )}
                      </div>
                      {onDismiss && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => onDismiss(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: fr })}
                      </span>
                      {alert.actionHref && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => navigate(alert.actionHref!)}
                        >
                          {alert.actionLabel || 'Voir'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
