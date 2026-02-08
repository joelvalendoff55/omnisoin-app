import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpcomingAppointments } from '@/hooks/useAppointments';
import { getTypeColor } from '@/lib/appointments';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function DashboardAppointmentsWidget() {
  const { appointments, loading } = useUpcomingAppointments(5);
  const [showEmpty, setShowEmpty] = useState(false);

  // Timeout pour éviter les skeletons infinis - après 3 secondes, montrer l'état vide
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowEmpty(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowEmpty(false);
    }
  }, [loading]);

  // Si loading est vrai mais timeout atteint, ou si pas en loading et pas d'appointments
  const shouldShowEmpty = (!loading && appointments.length === 0) || (loading && showEmpty);

  if (loading && !showEmpty) {
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
            {/* Skeletons statiques (sans animation) pour éviter les vibrations */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full bg-muted rounded-md" />
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
        {shouldShowEmpty ? (
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
                <Link
                  key={appointment.id}
                  to={`/agenda?date=${format(startTime, 'yyyy-MM-dd')}`}
                  className="block"
                >
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    "hover:bg-accent/50 cursor-pointer"
                  )}>
                    <div className={cn(
                      "w-1.5 h-12 rounded-full",
                      getTypeColor(appointment.appointment_type)
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{patientName}</span>
                        <Badge variant="outline" className="text-xs">
                          {appointment.appointment_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(startTime, 'HH:mm', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {practitionerName}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
