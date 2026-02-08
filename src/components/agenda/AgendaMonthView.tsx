"use client";

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Appointment, getTypeColor } from '@/lib/appointments';

interface AgendaMonthViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function AgendaMonthView({
  selectedDate,
  appointments,
  onDayClick,
  onAppointmentClick,
}: AgendaMonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { locale: fr });
    const calendarEnd = endOfWeek(monthEnd, { locale: fr });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedDate]);

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start_time);
      return isSameDay(aptDate, date);
    });
  };

  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 auto-rows-fr min-h-full">
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r border-b min-h-[120px] p-1 cursor-pointer hover:bg-accent/30 transition-colors',
                  !isCurrentMonth && 'bg-muted/30',
                  isToday(day) && 'bg-primary/5'
                )}
                onClick={() => onDayClick(day)}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium px-1.5 py-0.5 rounded-full',
                      !isCurrentMonth && 'text-muted-foreground',
                      isToday(day) && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayAppointments.length - 3}
                    </span>
                  )}
                </div>

                {/* Appointments (max 3 visible) */}
                <div className="space-y-0.5">
                  {dayAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        'text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80',
                        getTypeColor(apt.appointment_type)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(apt);
                      }}
                    >
                      {format(new Date(apt.start_time), 'HH:mm')} {apt.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
