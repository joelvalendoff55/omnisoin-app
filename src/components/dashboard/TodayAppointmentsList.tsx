import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User, MapPin, CheckCircle } from 'lucide-react';
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
  const navigate = useNavigate();

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

  // Afficher toujours le contenu (pas de skeletons pour éviter les vibrations)
  // Si pas de RDV, montrer le message vide directement
  const showEmpty = appointments.length === 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Clock className="h-5 w-5" />
          RDV du jour
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <a onClick={() => navigate('/agenda')}>Voir tout</a>
        </Button>
      </CardHeader>
      <CardContent>
        {showEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun rendez-vous aujourd'hui
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {sortedAppointments.map((appointment) => {
                const startTime = new Date(appointment.start_time);
                const patientName = appointment.patient
                  ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                  : 'Sans patient';

                return (
                  <div
                    key={appointment.id}
                    onClick={() => navigate(`/consultations/${appointment.id}`)}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
                      appointment.isNow && 'border-primary bg-primary/5',
                      appointment.isPast && appointment.status !== 'completed' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {format(startTime, 'HH:mm', { locale: fr })}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getTypeColor(appointment.type))}
                          >
                            {getTypeLabel(appointment.type)}
                          </Badge>
                          {appointment.isNow && (
                            <Badge variant="default" className="text-xs">
                              En cours
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{patientName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span>{getLocationLabel(appointment.location)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {appointment.status === 'completed' ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Terminé
                          </Badge>
                        ) : (
                          onComplete && !appointment.isPast && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onComplete(appointment.id);
                              }}
                            >
                              Terminer
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
