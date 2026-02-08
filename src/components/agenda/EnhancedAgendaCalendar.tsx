import { useMemo, useState, useCallback } from 'react';
import { format, isSameDay, startOfWeek, addDays, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import DroppableTimeSlot from './DroppableTimeSlot';
import DraggableAppointmentCard from './DraggableAppointmentCard';
import ConfirmMoveDialog from './ConfirmMoveDialog';
import { Appointment } from '@/lib/appointments';
import { ViewMode } from './EnhancedAgendaHeader';
import { getPractitionerColor } from './AgendaFilters';

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface EnhancedAgendaCalendarProps {
  viewMode: ViewMode;
  selectedDate: Date;
  appointments: Appointment[];
  practitioners: TeamMember[];
  selectedPractitioners: string[];
  arrivedPatientIds?: string[];
  onSlotClick: (date: Date, hour: number, practitionerId?: string) => void;
  onSlotDoubleClick: (date: Date, hour: number, practitionerId?: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentMove: (id: string, newStart: Date, newEnd: Date) => Promise<void>;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h to 20h

export default function EnhancedAgendaCalendar({
  viewMode,
  selectedDate,
  appointments,
  practitioners,
  selectedPractitioners,
  arrivedPatientIds = [],
  onSlotClick,
  onSlotDoubleClick,
  onAppointmentClick,
  onAppointmentMove,
}: EnhancedAgendaCalendarProps) {
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    appointment: Appointment;
    newStart: Date;
    newEnd: Date;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const filteredPractitioners = useMemo(() => {
    if (selectedPractitioners.length === 0) return practitioners;
    return practitioners.filter((p) => selectedPractitioners.includes(p.id));
  }, [practitioners, selectedPractitioners]);

  // Detect conflicts (overlapping appointments for same practitioner)
  const conflictingAppointmentIds = useMemo(() => {
    const conflicts = new Set<string>();
    
    appointments.forEach((apt1) => {
      appointments.forEach((apt2) => {
        if (apt1.id === apt2.id) return;
        if (apt1.practitioner_id !== apt2.practitioner_id) return;
        
        const start1 = new Date(apt1.start_time).getTime();
        const end1 = new Date(apt1.end_time).getTime();
        const start2 = new Date(apt2.start_time).getTime();
        const end2 = new Date(apt2.end_time).getTime();
        
        // Check overlap
        if (start1 < end2 && start2 < end1) {
          conflicts.add(apt1.id);
          conflicts.add(apt2.id);
        }
      });
    });
    
    return conflicts;
  }, [appointments]);

  const getAppointmentsForSlot = (date: Date, hour: number, practitionerId?: string) => {
    return appointments.filter((apt) => {
      const aptStart = new Date(apt.start_time);
      const aptHour = aptStart.getHours();
      const sameDay = isSameDay(aptStart, date);
      const sameHour = aptHour === hour;
      const samePractitioner = practitionerId ? apt.practitioner_id === practitionerId : true;
      return sameDay && sameHour && samePractitioner;
    });
  };

  const getPractitionerIndex = (practitionerId: string) => {
    return practitioners.findIndex((p) => p.id === practitionerId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const appointment = event.active.data.current?.appointment as Appointment;
    setActiveAppointment(appointment);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over) return;

    const appointment = active.data.current?.appointment as Appointment;
    const targetData = over.data.current as {
      type: string;
      hour: number;
      date: Date;
      practitionerId?: string;
    };

    if (targetData?.type !== 'timeslot') return;

    const oldStart = new Date(appointment.start_time);
    const oldEnd = new Date(appointment.end_time);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(targetData.date);
    newStart.setHours(targetData.hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Check if actually moved
    if (newStart.getTime() === oldStart.getTime()) return;

    setPendingMove({ appointment, newStart, newEnd });
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    
    await onAppointmentMove(pendingMove.appointment.id, pendingMove.newStart, pendingMove.newEnd);
    setPendingMove(null);
    setConfirmDialogOpen(false);
  };

  const currentHour = new Date().getHours();

  if (viewMode === 'day') {
    // Day view: columns = practitioners, rows = hours
    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="flex border-b sticky top-0 bg-background z-10">
              <div className="w-16 flex-shrink-0 border-r p-2 text-center text-sm font-medium text-muted-foreground">
                Heure
              </div>
              {filteredPractitioners.map((practitioner, index) => (
                <div
                  key={practitioner.id}
                  className="flex-1 min-w-[150px] border-r p-2 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn('w-3 h-3 rounded-full', getPractitionerColor(index))} />
                    <span className="font-medium">
                      {practitioner.profile?.first_name || ''} {practitioner.profile?.last_name || ''}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{practitioner.job_title}</div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            {HOURS.map((hour) => (
              <div key={hour} className="flex">
                <div
                  className={cn(
                    'w-16 flex-shrink-0 border-r border-b p-2 text-center text-sm text-muted-foreground',
                    isToday(selectedDate) && hour === currentHour && 'bg-primary/10 font-medium'
                  )}
                >
                  {hour}:00
                </div>
                {filteredPractitioners.map((practitioner) => {
                  const slotId = `${selectedDate.toISOString()}-${hour}-${practitioner.id}`;
                  const slotAppointments = getAppointmentsForSlot(selectedDate, hour, practitioner.id);

                  return (
                    <div key={practitioner.id} className="flex-1 min-w-[150px]">
                      <SortableContext
                        items={slotAppointments.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <DroppableTimeSlot
                          id={slotId}
                          hour={hour}
                          date={selectedDate}
                          practitionerId={practitioner.id}
                          onClick={onSlotClick}
                          onDoubleClick={onSlotDoubleClick}
                          isCurrentHour={isToday(selectedDate) && hour === currentHour}
                        >
                          <div className="space-y-1">
                            {slotAppointments.map((apt) => (
                              <DraggableAppointmentCard
                                key={apt.id}
                                appointment={apt}
                                practitionerIndex={getPractitionerIndex(apt.practitioner_id)}
                                isConflict={conflictingAppointmentIds.has(apt.id)}
                                patientArrived={apt.patient_id ? arrivedPatientIds.includes(apt.patient_id) : false}
                                onClick={onAppointmentClick}
                              />
                            ))}
                          </div>
                        </DroppableTimeSlot>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeAppointment && (
            <div className="opacity-80">
              <DraggableAppointmentCard
                appointment={activeAppointment}
                practitionerIndex={getPractitionerIndex(activeAppointment.practitioner_id)}
              />
            </div>
          )}
        </DragOverlay>

        <ConfirmMoveDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          appointment={pendingMove?.appointment || null}
          newStartTime={pendingMove?.newStart || null}
          newEndTime={pendingMove?.newEnd || null}
          onConfirm={handleConfirmMove}
        />
      </DndContext>
    );
  }

  // Week view: columns = days, rows = hours
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-16 flex-shrink-0 border-r p-2 text-center text-sm font-medium text-muted-foreground">
              Heure
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 min-w-[100px] border-r p-2 text-center',
                  isToday(day) && 'bg-primary/10'
                )}
              >
                <div className="font-medium capitalize">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div
                  className={cn(
                    'text-2xl',
                    isToday(day) && 'text-primary font-bold'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          {HOURS.map((hour) => (
            <div key={hour} className="flex">
              <div className="w-16 flex-shrink-0 border-r border-b p-2 text-center text-sm text-muted-foreground">
                {hour}:00
              </div>
              {weekDays.map((day) => {
                const slotId = `${day.toISOString()}-${hour}`;
                const slotAppointments = getAppointmentsForSlot(day, hour);

                return (
                  <div key={day.toISOString()} className="flex-1 min-w-[100px]">
                    <SortableContext
                      items={slotAppointments.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <DroppableTimeSlot
                        id={slotId}
                        hour={hour}
                        date={day}
                        onClick={onSlotClick}
                        onDoubleClick={onSlotDoubleClick}
                        isCurrentHour={isToday(day) && hour === currentHour}
                      >
                        <div className="space-y-1">
                          {slotAppointments.map((apt) => (
                            <DraggableAppointmentCard
                              key={apt.id}
                              appointment={apt}
                              practitionerIndex={getPractitionerIndex(apt.practitioner_id)}
                              isConflict={conflictingAppointmentIds.has(apt.id)}
                              patientArrived={apt.patient_id ? arrivedPatientIds.includes(apt.patient_id) : false}
                              onClick={onAppointmentClick}
                            />
                          ))}
                        </div>
                      </DroppableTimeSlot>
                    </SortableContext>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <DragOverlay>
        {activeAppointment && (
          <div className="opacity-80">
            <DraggableAppointmentCard
              appointment={activeAppointment}
              practitionerIndex={getPractitionerIndex(activeAppointment.practitioner_id)}
            />
          </div>
        )}
      </DragOverlay>

      <ConfirmMoveDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        appointment={pendingMove?.appointment || null}
        newStartTime={pendingMove?.newStart || null}
        newEndTime={pendingMove?.newEnd || null}
        onConfirm={handleConfirmMove}
      />
    </DndContext>
  );
}
