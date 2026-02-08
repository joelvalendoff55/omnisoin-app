import { useMemo } from 'react';
import { format, isSameDay, startOfWeek, addDays, isSameHour, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import TimeSlot from './TimeSlot';
import AppointmentCard from './AppointmentCard';
import { Appointment } from '@/lib/appointments';

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AgendaCalendarProps {
  viewMode: 'day' | 'week';
  selectedDate: Date;
  appointments: Appointment[];
  practitioners: TeamMember[];
  selectedPractitioner: string;
  onSlotClick: (date: Date, hour: number, practitionerId?: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentEdit: (appointment: Appointment) => void;
  onAppointmentComplete: (id: string) => void;
  onAppointmentCancel: (id: string) => void;
  onAppointmentDelete: (id: string) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h to 20h

export default function AgendaCalendar({
  viewMode,
  selectedDate,
  appointments,
  practitioners,
  selectedPractitioner,
  onSlotClick,
  onAppointmentClick,
  onAppointmentEdit,
  onAppointmentComplete,
  onAppointmentCancel,
  onAppointmentDelete,
}: AgendaCalendarProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const filteredPractitioners = useMemo(() => {
    if (selectedPractitioner === 'all') return practitioners;
    return practitioners.filter((p) => p.id === selectedPractitioner);
  }, [practitioners, selectedPractitioner]);

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

  const currentHour = new Date().getHours();

  if (viewMode === 'day') {
    // Day view: columns = practitioners, rows = hours
    return (
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-16 flex-shrink-0 border-r p-2 text-center text-sm font-medium text-muted-foreground">
              Heure
            </div>
            {filteredPractitioners.map((practitioner) => (
              <div
                key={practitioner.id}
                className="flex-1 min-w-[150px] border-r p-2 text-center"
              >
                <div className="font-medium">
                  {practitioner.profile?.first_name || ''} {practitioner.profile?.last_name || ''}
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
              {filteredPractitioners.map((practitioner) => (
                <div key={practitioner.id} className="flex-1 min-w-[150px]">
                  <TimeSlot
                    hour={hour}
                    date={selectedDate}
                    practitionerId={practitioner.id}
                    onClick={onSlotClick}
                    isCurrentHour={isToday(selectedDate) && hour === currentHour}
                  >
                    <div className="space-y-1">
                      {getAppointmentsForSlot(selectedDate, hour, practitioner.id).map((apt) => (
                        <AppointmentCard
                          key={apt.id}
                          appointment={apt}
                          compact
                          onClick={onAppointmentClick}
                        />
                      ))}
                    </div>
                  </TimeSlot>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Week view: columns = days, rows = hours
  return (
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
            <div
              className={cn(
                'w-16 flex-shrink-0 border-r border-b p-2 text-center text-sm text-muted-foreground'
              )}
            >
              {hour}:00
            </div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="flex-1 min-w-[100px]">
                <TimeSlot
                  hour={hour}
                  date={day}
                  onClick={onSlotClick}
                  isCurrentHour={isToday(day) && hour === currentHour}
                >
                  <div className="space-y-1">
                    {getAppointmentsForSlot(day, hour).map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        compact
                        onClick={onAppointmentClick}
                      />
                    ))}
                  </div>
                </TimeSlot>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
