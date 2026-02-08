import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedQueueItem } from './EnhancedQueueItem';

interface SortableQueueItemProps {
  id: string;
  patientName: string;
  arrivalTime?: string;
  reason?: string;
  priority?: number;
  status?: string;
  isNew?: boolean;
  onClick?: () => void;
}

export function SortableQueueItem(props: SortableQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center",
          "cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "text-muted-foreground hover:text-foreground",
          isDragging && "opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      {/* Item content with left padding for drag handle */}
      <div className={cn(
        "pl-6",
        isDragging && "shadow-lg rounded-lg"
      )}>
        <EnhancedQueueItem {...props} />
      </div>
    </div>
  );
}
