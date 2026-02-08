import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableQueueItem } from './SortableQueueItem';
import { EnhancedQueueItem } from './EnhancedQueueItem';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';

interface QueueEntry {
  id: string;
  patient?: {
    first_name?: string;
    last_name?: string;
  } | null;
  arrival_time?: string | null;
  reason?: string | null;
  consultation_reason?: {
    label?: string;
  } | null;
  priority?: number | null;
  status?: string | null;
}

interface DraggableQueueListProps {
  entries: QueueEntry[];
  structureId: string;
  onReorder: (reorderedEntries: QueueEntry[]) => void;
  onItemClick: (entryId: string) => void;
}

export function DraggableQueueList({ 
  entries, 
  structureId, 
  onReorder, 
  onItemClick 
}: DraggableQueueListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedEntries = arrayMove(entries, oldIndex, newIndex);
    
    // Optimistically update UI
    onReorder(reorderedEntries);

    // Persist to database
    setIsSaving(true);
    try {
      const orderedIds = reorderedEntries.map(e => e.id);
      const { error } = await supabase.rpc('update_queue_order', {
        p_structure_id: structureId,
        p_ordered_ids: orderedIds,
      });

      if (error) throw error;
      
      toast.success('Ordre mis à jour', { duration: 2000 });
    } catch (error) {
      console.error('Error updating queue order:', error);
      toast.error('Erreur lors de la mise à jour de l\'ordre');
      // Revert on error
      onReorder(entries);
    } finally {
      setIsSaving(false);
    }
  }, [entries, structureId, onReorder]);

  const activeEntry = activeId ? entries.find(e => e.id === activeId) : null;

  return (
    <div className="relative">
      {isSaving && (
        <div className="absolute top-0 right-0 text-xs text-muted-foreground animate-pulse">
          Enregistrement...
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {entries.map((entry) => (
              <SortableQueueItem
                key={entry.id}
                id={entry.id}
                patientName={`${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`}
                arrivalTime={entry.arrival_time || undefined}
                reason={entry.reason || entry.consultation_reason?.label || undefined}
                priority={entry.priority || 3}
                status={entry.status || undefined}
                onClick={() => onItemClick(entry.id)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeEntry && (
            <div className="opacity-80 shadow-xl">
              <EnhancedQueueItem
                id={activeEntry.id}
                patientName={`${activeEntry.patient?.first_name || ''} ${activeEntry.patient?.last_name || ''}`}
                arrivalTime={activeEntry.arrival_time || undefined}
                reason={activeEntry.reason || activeEntry.consultation_reason?.label || undefined}
                priority={activeEntry.priority || 3}
                status={activeEntry.status || undefined}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
