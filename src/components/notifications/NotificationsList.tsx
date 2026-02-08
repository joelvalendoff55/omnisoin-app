"use client";

import { useRouter } from "next/navigation";
import { CheckCheck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/lib/notifications';

interface NotificationsListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

export function NotificationsList({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
}: NotificationsListProps) {
  const router = useRouter();

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="p-4 space-y-3" data-testid="notifications-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 px-4 text-center"
        data-testid="notifications-empty"
      >
        <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Aucune notification</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Vous serez notifié des événements importants
        </p>
      </div>
    );
  }

  return (
    <div data-testid="notifications-list">
      {/* Header with mark all as read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="text-xs text-muted-foreground">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onMarkAllAsRead}
            data-testid="mark-all-read"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Tout marquer lu
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <ScrollArea className="h-[400px]">
        <div className="p-2 space-y-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
              onClick={handleNotificationClick}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
