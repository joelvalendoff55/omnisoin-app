import { useEffect, useState, useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitingPatient {
  waitingMinutes: number;
}

interface AverageWaitTimeCardProps {
  waitingPatients: WaitingPatient[];
}

export function AverageWaitTimeCard({ waitingPatients }: AverageWaitTimeCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update every 30 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const { averageMinutes, status, trend } = useMemo(() => {
    if (waitingPatients.length === 0) {
      return { averageMinutes: 0, status: 'ok' as const, trend: 'stable' as const };
    }

    const total = waitingPatients.reduce((sum, p) => sum + p.waitingMinutes, 0);
    const avg = Math.round(total / waitingPatients.length);

    // Determine status based on average wait time
    let status: 'ok' | 'attention' | 'urgent';
    if (avg <= 15) {
      status = 'ok';
    } else if (avg <= 30) {
      status = 'attention';
    } else {
      status = 'urgent';
    }

    // Simple trend indicator based on max wait
    const maxWait = Math.max(...waitingPatients.map(p => p.waitingMinutes));
    let trend: 'up' | 'down' | 'stable';
    if (maxWait > avg + 10) {
      trend = 'up';
    } else if (maxWait < avg - 5) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return { averageMinutes: avg, status, trend };
  }, [waitingPatients, currentTime]);

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const statusStyles = {
    ok: 'text-success border-success/30 bg-success/10',
    attention: 'text-warning border-warning/30 bg-warning/10',
    urgent: 'text-destructive border-destructive/30 bg-destructive/10',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn(
      "relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
      statusStyles[status]
    )}>
      <div className={cn(
        "p-2 rounded-full",
        status === 'ok' && "bg-success/20",
        status === 'attention' && "bg-warning/20",
        status === 'urgent' && "bg-destructive/20 animate-pulse"
      )}>
        <Clock className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {formatTime(averageMinutes)}
          </span>
          {waitingPatients.length > 0 && (
            <TrendIcon className={cn(
              "h-4 w-4",
              trend === 'up' && "text-destructive",
              trend === 'down' && "text-success",
              trend === 'stable' && "text-muted-foreground"
            )} />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Temps d'attente moyen
          {waitingPatients.length > 0 && (
            <span className="ml-1">({waitingPatients.length} patient{waitingPatients.length > 1 ? 's' : ''})</span>
          )}
        </p>
      </div>
      
      {/* Real-time indicator */}
      <div className="absolute top-2 right-2">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[9px] text-muted-foreground">Live</span>
        </div>
      </div>
    </div>
  );
}
