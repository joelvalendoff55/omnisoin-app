import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Users, Clock, Calendar, CheckSquare, TrendingUp, Euro, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Settings2, Plus } from 'lucide-react';
import DraggableKPIWidget, { KPIWidgetData } from './DraggableKPIWidget';
import { cn } from '@/lib/utils';

interface KPIGridProps {
  stats: {
    patientsToday: number;
    queueWaiting: number;
    queueInProgress: number;
    appointmentsToday: number;
    appointmentsCompleted: number;
    tasksPending: number;
    averageWaitTime: number;
  };
  loading?: boolean;
  onNavigate: (path: string) => void;
}

const STORAGE_KEY = 'dashboard-kpi-order';

const DEFAULT_WIDGETS: KPIWidgetData[] = [
  {
    id: 'patients-today',
    title: 'Patients vus',
    value: 0,
    icon: <Users className="h-5 w-5" />,
    color: 'success',
    href: '/queue?status=completed',
  },
  {
    id: 'queue-waiting',
    title: 'En attente',
    value: 0,
    icon: <Clock className="h-5 w-5" />,
    color: 'warning',
    href: '/file-attente',
  },
  {
    id: 'appointments-today',
    title: 'RDV du jour',
    value: 0,
    icon: <Calendar className="h-5 w-5" />,
    color: 'primary',
    href: '/agenda',
  },
  {
    id: 'tasks-pending',
    title: 'Tâches en attente',
    value: 0,
    icon: <CheckSquare className="h-5 w-5" />,
    color: 'muted',
    href: '/tasks',
  },
  {
    id: 'avg-wait-time',
    title: 'Attente moyenne',
    value: 0,
    suffix: 'min',
    icon: <Activity className="h-5 w-5" />,
    color: 'primary',
  },
  {
    id: 'in-progress',
    title: 'En consultation',
    value: 0,
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'success',
    href: '/queue?status=in_consultation',
  },
];

export default function DraggableKPIGrid({ stats, loading, onNavigate }: KPIGridProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return DEFAULT_WIDGETS.map((w) => w.id);
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build widgets with current values
  const widgets = useMemo(() => {
    const widgetMap: Record<string, KPIWidgetData> = {
      'patients-today': {
        ...DEFAULT_WIDGETS.find((w) => w.id === 'patients-today')!,
        value: stats.patientsToday,
      },
      'queue-waiting': {
        ...DEFAULT_WIDGETS.find((w) => w.id === 'queue-waiting')!,
        value: stats.queueWaiting,
      },
      'appointments-today': {
        ...DEFAULT_WIDGETS.find((w) => w.id === 'appointments-today')!,
        value: stats.appointmentsToday,
      },
      'tasks-pending': {
        ...DEFAULT_WIDGETS.find((w) => w.id === 'tasks-pending')!,
        value: stats.tasksPending,
      },
      'avg-wait-time': {
        ...DEFAULT_WIDGETS.find((w) => w.id === 'avg-wait-time')!,
        value: stats.averageWaitTime,
      },
      'in-progress': {
        ...DEFAULT_WIDGETS.find((w) => w.id === 'in-progress')!,
        value: stats.queueInProgress,
      },
    };

    return widgetOrder
      .filter((id) => widgetMap[id])
      .map((id) => widgetMap[id]);
  }, [widgetOrder, stats]);

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
        
        return newOrder;
      });
    }
  };

  const handleRemoveWidget = (id: string) => {
    setWidgetOrder((items) => {
      const newOrder = items.filter((i) => i !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
  };

  const handleResetOrder = () => {
    const defaultOrder = DEFAULT_WIDGETS.map((w) => w.id);
    setWidgetOrder(defaultOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultOrder));
  };

  return (
    <div className="space-y-3">
      {/* Edit controls */}
      <div className="flex items-center justify-end gap-2">
        {isEditing && (
          <Button variant="outline" size="sm" onClick={handleResetOrder}>
            Réinitialiser
          </Button>
        )}
        <Button
          variant={isEditing ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          {isEditing ? 'Terminer' : 'Personnaliser'}
        </Button>
      </div>

      {/* KPI Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className={cn(
            'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4',
            isEditing && 'p-2 border-2 border-dashed border-muted-foreground/30 rounded-lg'
          )}>
            {widgets.map((widget) => (
              <DraggableKPIWidget
                key={widget.id}
                widget={widget}
                isEditing={isEditing}
                onRemove={handleRemoveWidget}
                onClick={widget.href ? () => onNavigate(widget.href!) : undefined}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget && (
            <div className="opacity-80">
              <DraggableKPIWidget widget={activeWidget} isEditing />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
