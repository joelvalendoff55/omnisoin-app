"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface KPIWidgetData {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  suffix?: string;
  icon: React.ReactNode;
  color: 'primary' | 'warning' | 'success' | 'destructive' | 'muted';
  href?: string;
}

interface DraggableKPIWidgetProps {
  widget: KPIWidgetData;
  isEditing?: boolean;
  onRemove?: (id: string) => void;
  onClick?: () => void;
}

export default function DraggableKPIWidget({
  widget,
  isEditing = false,
  onRemove,
  onClick,
}: DraggableKPIWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    muted: 'bg-muted text-muted-foreground',
  };

  // Calculate trend
  const trend = widget.previousValue !== undefined && typeof widget.value === 'number'
    ? widget.value - widget.previousValue
    : null;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50 z-50')}>
      <Card
        className={cn(
          'relative transition-all group',
          isEditing && 'ring-2 ring-dashed ring-muted-foreground/30',
          !isEditing && onClick && 'cursor-pointer hover:shadow-md hover:border-primary/20'
        )}
        onClick={!isEditing ? onClick : undefined}
      >
        {/* Drag handle */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Remove button */}
        {isEditing && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(widget.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        <CardContent className={cn('p-5', isEditing && 'pl-8')}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{widget.title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold">{widget.value}</p>
                {widget.suffix && (
                  <span className="text-sm text-muted-foreground">{widget.suffix}</span>
                )}
              </div>
              
              {/* Trend indicator */}
              {trend !== null && (
                <div className={cn(
                  'flex items-center gap-1 text-xs mt-1',
                  trend > 0 && 'text-green-600',
                  trend < 0 && 'text-red-600',
                  trend === 0 && 'text-muted-foreground'
                )}>
                  {trend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>
                    {trend > 0 ? '+' : ''}{trend} vs hier
                  </span>
                </div>
              )}
            </div>
            <div className={cn('p-3 rounded-xl', colorClasses[widget.color])}>
              {widget.icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
