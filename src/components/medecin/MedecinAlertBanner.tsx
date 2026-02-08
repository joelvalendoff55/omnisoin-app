import { AlertTriangle, Clock, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface MedecinAlert {
  type: 'urgent' | 'warning' | 'clinical';
  message: string;
  count?: number;
}

interface MedecinAlertBannerProps {
  alerts: MedecinAlert[];
  clinicalRedFlags?: string[];
  onDismiss?: () => void;
}

export function MedecinAlertBanner({ 
  alerts, 
  clinicalRedFlags = [],
  onDismiss 
}: MedecinAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Combine alerts with clinical red flags
  const allAlerts: MedecinAlert[] = [
    ...alerts,
    ...clinicalRedFlags.map(flag => ({
      type: 'clinical' as const,
      message: flag,
    })),
  ];

  if (allAlerts.length === 0 || dismissed) return null;

  // Determine priority: urgent > clinical > warning
  const hasUrgent = allAlerts.some(a => a.type === 'urgent');
  const hasClinical = allAlerts.some(a => a.type === 'clinical');
  const priorityType = hasUrgent ? 'urgent' : hasClinical ? 'clinical' : 'warning';

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getBannerStyles = () => {
    switch (priorityType) {
      case 'urgent':
        return 'bg-destructive/10 border-destructive text-destructive';
      case 'clinical':
        return 'bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-warning/10 border-warning text-warning-foreground';
    }
  };

  const getIconStyles = () => {
    switch (priorityType) {
      case 'urgent':
        return 'bg-destructive/20';
      case 'clinical':
        return 'bg-orange-500/20';
      default:
        return 'bg-warning/20';
    }
  };

  const getIcon = () => {
    switch (priorityType) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />;
      case 'clinical':
        return <Activity className="h-5 w-5 text-orange-500 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getTitle = () => {
    switch (priorityType) {
      case 'urgent':
        return 'ALERTE URGENTE';
      case 'clinical':
        return 'DRAPEAUX ROUGES CLINIQUES';
      default:
        return 'ATTENTION';
    }
  };

  // Group alerts by type for display
  const urgentAlerts = allAlerts.filter(a => a.type === 'urgent');
  const clinicalAlerts = allAlerts.filter(a => a.type === 'clinical');
  const warningAlerts = allAlerts.filter(a => a.type === 'warning');

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg border-2",
        getBannerStyles()
      )}
      style={{
        animation: priorityType === 'urgent' || priorityType === 'clinical' 
          ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
          : undefined
      }}
      role="alert"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full",
          getIconStyles()
        )}>
          {getIcon()}
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className={cn(
            "font-semibold text-sm",
            priorityType === 'urgent' && "text-destructive",
            priorityType === 'clinical' && "text-orange-700 dark:text-orange-400",
            priorityType === 'warning' && "text-warning"
          )}>
            {getTitle()}
          </span>
          
          <div className="text-sm text-foreground space-y-0.5">
            {urgentAlerts.length > 0 && (
              <p className="text-destructive font-medium truncate">
                🚨 {urgentAlerts.map(a => a.message).join(' • ')}
              </p>
            )}
            {clinicalAlerts.length > 0 && (
              <p className="text-orange-700 dark:text-orange-400 truncate">
                ⚠️ {clinicalAlerts.map(a => a.message).join(' • ')}
              </p>
            )}
            {warningAlerts.length > 0 && (
              <p className="text-muted-foreground truncate">
                ⏱️ {warningAlerts.map(a => a.message).join(' • ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className={cn(
          "flex-shrink-0 p-1.5 rounded-md transition-colors",
          priorityType === 'urgent' && "hover:bg-destructive/20 text-destructive",
          priorityType === 'clinical' && "hover:bg-orange-500/20 text-orange-500",
          priorityType === 'warning' && "hover:bg-warning/20 text-warning"
        )}
        aria-label="Fermer l'alerte"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
