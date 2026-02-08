import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpcomingAppointments } from '@/hooks/useAppointments';
import { getTypeColor } from '@/lib/appointments';
import { cn } from '@/lib/utils';

export default function DashboardAppointmentsWidget() {
  const { appointments, loading } = useUpcomingAppointments(5);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prochains RDV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Calendar className="h-5 w-5" />
          Prochains RDV
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/agenda">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun rendez-vous à venir
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const startTime = new Date(appointment.start_time);
              const patientName = appointment.patient
                ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                : 'Sans patient';
              const practitionerName = appointment.practitioner?.profile
                ? `${appointment.practitioner.profile.first_name || ''} ${appointment.practitioner.profile.last_name || ''}`.trim()
                : 'Non assigné';

              return (
                <div
                  key={appointment.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-1 h-12 rounded-full',
                      getTypeColor(appointment.appointment_type)
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{appointment.title}</span>
                      {appointment.is_pdsa && (
                        <Badge variant="secondary" className="text-xs">
                          PDSA
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(startTime, 'HH:mm', { locale: fr })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {patientName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(startTime, 'EEEE d MMMM', { locale: fr })} • {practitionerName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
