"use client";

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  Calendar,
  Users,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/lib/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; className: string }> = {
  info: { icon: Info, className: 'text-blue-500' },
  success: { icon: CheckCircle, className: 'text-green-500' },
  warning: { icon: AlertTriangle, className: 'text-yellow-500' },
  error: { icon: AlertCircle, className: 'text-red-500' },
  task: { icon: ListTodo, className: 'text-purple-500' },
  appointment: { icon: Calendar, className: 'text-indigo-500' },
  queue: { icon: Users, className: 'text-orange-500' },
  message: { icon: MessageSquare, className: 'text-teal-500' },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onClick?.(notification);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      data-testid={`notification-item-${notification.id}`}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors group',
        notification.read
          ? 'bg-muted/30 hover:bg-muted/50'
          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
      )}
      onClick={handleClick}
    >
      <div className={cn('mt-0.5 shrink-0', config.className)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium leading-tight',
            !notification.read && 'text-foreground'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: fr,
          })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
        data-testid={`notification-delete-${notification.id}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
