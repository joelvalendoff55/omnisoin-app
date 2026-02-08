"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface WaitingTimeCellProps {
  arrivalTime: string;
  status: string;
}

function calculateWaitingTime(arrivalTime: string): { minutes: number; formatted: string } {
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
    formatted: `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}` 
  };
}

const ACTIVE_STATUSES = ['present', 'waiting', 'called', 'in_consultation', 'awaiting_exam'];

export function WaitingTimeCell({ arrivalTime, status }: WaitingTimeCellProps) {
  const [waitingTime, setWaitingTime] = useState(() => calculateWaitingTime(arrivalTime));
  
  useEffect(() => {
    // Initial calculation
    setWaitingTime(calculateWaitingTime(arrivalTime));
    
    // Update every minute
    const interval = setInterval(() => {
      setWaitingTime(calculateWaitingTime(arrivalTime));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [arrivalTime]);
  
  // Don't show for completed/cancelled statuses
  if (!ACTIVE_STATUSES.includes(status)) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  // Color coding based on wait time
  const getColorClasses = () => {
    if (waitingTime.minutes < 15) {
      return 'text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20';
    }
    if (waitingTime.minutes < 30) {
      return 'text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20';
    }
    // > 30 minutes - red with subtle pulse animation
    return 'text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20 animate-pulse';
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium ${getColorClasses()}`}>
      <Clock className="h-3.5 w-3.5" />
      <span>{waitingTime.formatted}</span>
    </div>
  );
}
