"use client";

import { useState, useEffect } from 'react';
import { Clock, User, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnhancedQueueItemProps {
  id: string;
  patientName: string;
  arrivalTime?: string;
  reason?: string;
  priority?: number;
  status?: string;
  isNew?: boolean;
  onClick?: () => void;
}

function getWaitingTime(arrivalTime: string): { minutes: number; formatted: string } {
  const arrival = new Date(arrivalTime);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const minutes = Math.floor(diffMs / 60000);
  
  if (minutes < 60) {
    return { minutes, formatted: `${minutes} min` };
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return { 
    minutes, 
    formatted: `${hours}h${remainingMinutes > 0 ? `${remainingMinutes}` : ''}` 
  };
}

function getPriorityConfig(priority: number): { label: string; className: string; dotClass: string } {
  switch (priority) {
    case 1:
      return { 
        label: 'Urgent', 
        className: 'bg-destructive/10 text-destructive border-destructive/30',
        dotClass: 'bg-destructive animate-pulse'
      };
    case 2:
      return { 
        label: 'Prioritaire', 
        className: 'bg-warning/10 text-warning border-warning/30',
        dotClass: 'bg-warning'
      };
    default:
      return { 
        label: 'Normal', 
        className: 'bg-success/10 text-success border-success/30',
        dotClass: 'bg-success'
      };
  }
}

function getWaitTimeColor(minutes: number): string {
  if (minutes < 15) return 'text-success bg-success/10';
  if (minutes < 30) return 'text-warning bg-warning/10';
  return 'text-destructive bg-destructive/10';
}

export function EnhancedQueueItem({
  id,
  patientName,
  arrivalTime,
  reason,
  priority = 3,
  status,
  isNew = false,
  onClick,
}: EnhancedQueueItemProps) {
  const [showNewBadge, setShowNewBadge] = useState(isNew);
  const [waitingTime, setWaitingTime] = useState(() => 
    arrivalTime ? getWaitingTime(arrivalTime) : { minutes: 0, formatted: '0 min' }
  );

  const priorityConfig = getPriorityConfig(priority);

  // Update waiting time every minute
  useEffect(() => {
    if (!arrivalTime) return;
    
    const interval = setInterval(() => {
      setWaitingTime(getWaitingTime(arrivalTime));
    }, 60000);

    return () => clearInterval(interval);
  }, [arrivalTime]);

  // Hide new badge after 5 seconds
  useEffect(() => {
    if (isNew) {
      setShowNewBadge(true);
      const timer = setTimeout(() => setShowNewBadge(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div 
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/30",
        priority === 1 && "border-destructive/50 bg-destructive/5",
        priority === 2 && "border-warning/50 bg-warning/5",
        priority >= 3 && "border-border bg-card",
        showNewBadge && "ring-2 ring-primary ring-offset-2 animate-pulse-soft"
      )}
      onClick={onClick}
    >
      {/* Priority dot indicator */}
      <div className={cn(
        "w-3 h-3 rounded-full flex-shrink-0",
        priorityConfig.dotClass
      )} />

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{patientName}</span>
          {showNewBadge && (
            <Badge variant="default" className="h-5 text-[10px] animate-bounce">
              <Sparkles className="h-3 w-3 mr-1" />
              Nouveau
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {arrivalTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(arrivalTime)}
            </span>
          )}
          {reason && (
            <>
              <span>•</span>
              <span className="truncate">{reason}</span>
            </>
          )}
        </div>
      </div>

      {/* Priority badge */}
      <Badge 
        variant="outline" 
        className={cn("text-[10px] font-medium", priorityConfig.className)}
      >
        {priority === 1 && <AlertTriangle className="h-3 w-3 mr-1" />}
        {priorityConfig.label}
      </Badge>

      {/* Waiting time with color coding */}
      {arrivalTime && (
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
          getWaitTimeColor(waitingTime.minutes)
        )}>
          <Clock className="h-3.5 w-3.5" />
          <span>{waitingTime.formatted}</span>
        </div>
      )}
    </div>
  );
}
