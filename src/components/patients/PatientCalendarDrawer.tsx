"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, CalendarDays, Plus } from 'lucide-react';
import { Patient } from '@/types/patient';
import { Appointment, fetchAppointmentsByPatient, getTypeLabel, getStatusLabel, getLocationLabel, getTypeColor } from '@/lib/appointments';
import { cn } from '@/lib/utils';

interface PatientCalendarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onCreateAppointment?: (patient: Patient, date?: Date) => void;
}

export function PatientCalendarDrawer({ open, onOpenChange, patient, onCreateAppointment }: PatientCalendarDrawerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (open && patient) {
      loadAppointments();
    }
  }, [open, patient]);

  const loadAppointments = async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const data = await fetchAppointmentsByPatient(patient.id);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { locale: fr });
    const calendarEnd = endOfWeek(monthEnd, { locale: fr });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.start_time), date));
  };

  // Get appointments for selected date
  const selectedDayAppointments = useMemo(() => {
    return getAppointmentsForDay(selectedDate).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }, [selectedDate, appointments]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = appointments.filter(apt => new Date(apt.start_time) > now && apt.status !== 'cancelled');
    const past = appointments.filter(apt => new Date(apt.start_time) <= now);
    const cancelled = appointments.filter(apt => apt.status === 'cancelled');
    return { total: appointments.length, upcoming: upcoming.length, past: past.length, cancelled: cancelled.length };
  }, [appointments]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <SheetTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Calendrier - {patient?.first_name} {patient?.last_name}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
                <div className="text-xs text-muted-foreground">À venir</div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.past}</div>
                <div className="text-xs text-muted-foreground">Passés</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                <div className="text-xs text-muted-foreground">Annulés</div>
              </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-lg capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Week days header */}
                <div className="grid grid-cols-7 bg-muted/50">
                  {weekDays.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const dayAppointments = getAppointmentsForDay(day);
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "relative p-2 min-h-[60px] border-t border-r text-left transition-colors hover:bg-muted/50",
                          !isCurrentMonth && "text-muted-foreground/50 bg-muted/20",
                          isToday && "bg-primary/5",
                          isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary font-bold"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {dayAppointments.length > 0 && (
                          <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 flex-wrap">
                            {dayAppointments.slice(0, 3).map((apt, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  getTypeColor(apt.appointment_type || 'consultation')
                                )}
                              />
                            ))}
                            {dayAppointments.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{dayAppointments.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Day Appointments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                </h4>
                {patient && onCreateAppointment && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1.5"
                    onClick={() => onCreateAppointment(patient, selectedDate)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter RDV
                  </Button>
                )}
              </div>

              {selectedDayAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun rendez-vous ce jour</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                  ))}
                </div>
              )}
            </div>

            {/* All Appointments List (upcoming) */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Prochains rendez-vous
              </h4>
              <div className="space-y-2">
                {appointments
                  .filter(apt => new Date(apt.start_time) > new Date() && apt.status !== 'cancelled')
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .slice(0, 5)
                  .map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} showDate />
                  ))}
                {appointments.filter(apt => new Date(apt.start_time) > new Date() && apt.status !== 'cancelled').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun rendez-vous à venir
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function AppointmentCard({ appointment, showDate = false }: { appointment: Appointment; showDate?: boolean }) {
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const isPast = startTime < new Date();
  const isCancelled = appointment.status === 'cancelled';

  return (
    <div className={cn(
      "p-3 rounded-lg border bg-card transition-all",
      isPast && !isCancelled && "opacity-60",
      isCancelled && "opacity-50 line-through"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-1 h-full min-h-[40px] rounded-full flex-shrink-0",
          getTypeColor(appointment.appointment_type || 'consultation')
        )} />
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{appointment.title}</span>
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(appointment.appointment_type || 'consultation')}
            </Badge>
            <Badge 
              variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {getStatusLabel(appointment.status || 'scheduled')}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {showDate && format(startTime, 'dd/MM', { locale: fr })} {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </span>
            {appointment.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {getLocationLabel(appointment.location)}
              </span>
            )}
          </div>

          {appointment.practitioner?.profile && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              Dr. {appointment.practitioner.profile.first_name} {appointment.practitioner.profile.last_name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
