"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Appointment, fetchAppointmentsByPatient, getTypeLabel, getTypeColor, getLocationLabel, getStatusLabel } from '@/lib/appointments';
import { cn } from '@/lib/utils';

interface PatientAppointmentsListProps {
  patientId: string;
}

export default function PatientAppointmentsList({ patientId }: PatientAppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchAppointmentsByPatient(patientId);
        setAppointments(data);
      } catch (err) {
        console.error('Error fetching patient appointments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Rendez-vous
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.start_time) >= now && apt.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(
    (apt) => new Date(apt.start_time) < now || apt.status === 'cancelled'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Rendez-vous ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun rendez-vous pour ce patient
          </p>
        ) : (
          <>
            {upcomingAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  À venir ({upcomingAppointments.length})
                </h4>
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 3).map((apt) => (
                    <AppointmentItem key={apt.id} appointment={apt} />
                  ))}
                </div>
              </div>
            )}

            {pastAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Historique ({pastAppointments.length})
                </h4>
                <div className="space-y-2">
                  {pastAppointments.slice(0, 5).map((apt) => (
                    <AppointmentItem key={apt.id} appointment={apt} isPast />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentItem({ appointment, isPast = false }: { appointment: Appointment; isPast?: boolean }) {
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);

  const practitionerName = appointment.practitioner?.profile
    ? `${appointment.practitioner.profile.first_name || ''} ${appointment.practitioner.profile.last_name || ''}`.trim()
    : 'Non assigné';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        isPast && 'opacity-60'
      )}
    >
      <div className={cn('w-1 h-full min-h-[50px] rounded-full', getTypeColor(appointment.appointment_type))} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{appointment.title}</span>
          {appointment.is_pdsa && (
            <Badge variant="secondary" className="text-xs">
              PDSA
            </Badge>
          )}
          <Badge variant={appointment.status === 'cancelled' ? 'destructive' : 'outline'} className="text-xs">
            {getStatusLabel(appointment.status)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(startTime, 'd MMM yyyy', { locale: fr })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {practitionerName}
          </span>
          {appointment.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {getLocationLabel(appointment.location)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
