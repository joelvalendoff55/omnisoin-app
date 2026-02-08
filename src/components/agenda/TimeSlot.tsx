"use client";

import { cn } from '@/lib/utils';

interface TimeSlotProps {
  hour: number;
  date: Date;
  practitionerId?: string;
  onClick?: (date: Date, hour: number, practitionerId?: string) => void;
  children?: React.ReactNode;
  isCurrentHour?: boolean;
}

export default function TimeSlot({
  hour,
  date,
  practitionerId,
  onClick,
  children,
  isCurrentHour = false,
}: TimeSlotProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(date, hour, practitionerId);
    }
  };

  return (
    <div
      className={cn(
        'min-h-[60px] border-b border-r border-border/50 p-1 cursor-pointer hover:bg-accent/50 transition-colors relative',
        isCurrentHour && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
