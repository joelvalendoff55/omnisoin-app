import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useUpcomingAppointments } from '@/hooks/useAppointments';
import { getTypeColor } from '@/lib/appointments';

export function AssistantUpcomingAppointments() {
  const { appointments, loading } = useUpcomingAppointments(5);

  // Filter to only today's appointments
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todaysAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    return aptDate >= todayStart && aptDate < todayEnd;
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (todaysAppointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
        <Calendar className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Aucun RDV aujourd'hui</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todaysAppointments.map((apt) => {
        const startTime = new Date(apt.start_time);
        const patientName = apt.patient
          ? `${apt.patient.first_name} ${apt.patient.last_name}`
          : 'Patient inconnu';

        return (
          <div
            key={apt.id}
            className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className={`w-1 h-10 rounded-full ${getTypeColor(apt.appointment_type)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{patientName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{format(startTime, 'HH:mm', { locale: fr })}</span>
                {apt.is_pdsa && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    PDSA
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
