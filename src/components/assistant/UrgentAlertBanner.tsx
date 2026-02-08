"use client";

import { AlertTriangle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface UrgentAlert {
  type: 'urgent' | 'warning';
  message: string;
  count?: number;
}

interface UrgentAlertBannerProps {
  alerts: UrgentAlert[];
  onDismiss?: () => void;
}

export function UrgentAlertBanner({ alerts, onDismiss }: UrgentAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (alerts.length === 0 || dismissed) return null;

  // Get the highest priority alert
  const hasUrgent = alerts.some(a => a.type === 'urgent');
  const primaryAlert = alerts.find(a => a.type === (hasUrgent ? 'urgent' : 'warning')) || alerts[0];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg border-2 animate-pulse-soft",
        hasUrgent 
          ? "bg-destructive/10 border-destructive text-destructive" 
          : "bg-warning/10 border-warning text-warning-foreground"
      )}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          hasUrgent ? "bg-destructive/20" : "bg-warning/20"
        )}>
          {hasUrgent ? (
            <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
          ) : (
            <Clock className="h-5 w-5 text-warning" />
          )}
        </div>
        
        <div className="flex flex-col">
          <span className={cn(
            "font-semibold text-sm",
            hasUrgent ? "text-destructive" : "text-warning"
          )}>
            {hasUrgent ? 'ALERTE URGENTE' : 'ATTENTION'}
          </span>
          <span className="text-sm text-foreground">
            {alerts.map(a => a.message).join(' • ')}
          </span>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          hasUrgent 
            ? "hover:bg-destructive/20 text-destructive" 
            : "hover:bg-warning/20 text-warning"
        )}
        aria-label="Fermer l'alerte"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
