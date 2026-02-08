"use client";

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableTimeSlotProps {
  id: string;
  hour: number;
  date: Date;
  practitionerId?: string;
  onClick?: (date: Date, hour: number, practitionerId?: string) => void;
  onDoubleClick?: (date: Date, hour: number, practitionerId?: string) => void;
  children?: React.ReactNode;
  isCurrentHour?: boolean;
}

export default function DroppableTimeSlot({
  id,
  hour,
  date,
  practitionerId,
  onClick,
  onDoubleClick,
  children,
  isCurrentHour = false,
}: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: 'timeslot',
      hour,
      date,
      practitionerId,
    },
  });

  const handleClick = () => {
    if (onClick) {
      onClick(date, hour, practitionerId);
    }
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(date, hour, practitionerId);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[60px] border-b border-r border-border/50 p-1 cursor-pointer hover:bg-accent/50 transition-colors relative',
        isCurrentHour && 'bg-primary/5',
        isOver && 'bg-primary/20 ring-2 ring-primary ring-inset'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </div>
  );
}
