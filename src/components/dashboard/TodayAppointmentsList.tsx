"use client";

import { useMemo } from 'react';
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User, MapPin, Phone, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Appointment, getTypeLabel, getTypeColor, getLocationLabel } from '@/lib/appointments';

interface TodayAppointmentsListProps {
  appointments: Appointment[];
  loading?: boolean;
  onComplete?: (id: string) => void;
}

export default function TodayAppointmentsList({
  appointments,
  loading,
  onComplete,
}: TodayAppointmentsListProps) {
  const router = useRouter();

  // Sort and filter today's appointments
  const sortedAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map((apt) => {
        const startTime = new Date(apt.start_time);
        const isPast = startTime < now;
        const isNow = startTime <= now && new Date(apt.end_time) >= now;
        return { ...apt, isPast, isNow };
      });
  }, [appointments]);

  const nextAppointment = sortedAppointments.find((apt) => !apt.isPast && apt.status !== 'completed');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RDV du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            RDV du jour
            <Badge variant="secondary">{appointments.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/agenda')}>
            Voir agenda
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun RDV prévu aujourd'hui</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {sortedAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50',
                    apt.isNow && 'bg-primary/10 border-primary/30',
                    apt.status === 'completed' && 'opacity-60',
                    apt.status === 'cancelled' && 'opacity-40 line-through'
                  )}
                  onClick={() => apt.patient_id && navigate(`/patients/${apt.patient_id}`)}
                >
                  {/* Time */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className={cn(
                      'text-sm font-medium',
                      apt.isNow && 'text-primary'
                    )}>
                      {format(new Date(apt.start_time), 'HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(apt.end_time), 'HH:mm')}
                    </div>
                  </div>

                  {/* Type indicator */}
                  <div className={cn('w-1 h-10 rounded-full', getTypeColor(apt.appointment_type))} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {apt.patient
                          ? `${apt.patient.first_name} ${apt.patient.last_name}`
                          : apt.title}
                      </span>
                      {apt.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {apt.practitioner?.profile?.first_name || 'N/A'}
                      </span>
                      {apt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getLocationLabel(apt.location)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(apt.appointment_type)}
                    </Badge>
                    {apt.patient_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/patients/${apt.patient_id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Next appointment highlight */}
        {nextAppointment && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prochain RDV</span>
              <span className="font-medium text-primary">
                {format(new Date(nextAppointment.start_time), 'HH:mm')} -{' '}
                {nextAppointment.patient
                  ? `${nextAppointment.patient.first_name} ${nextAppointment.patient.last_name}`
                  : nextAppointment.title}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
