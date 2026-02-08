"use client";

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User, MapPin, MoreVertical, Check, X, Edit, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Appointment, getTypeLabel, getTypeColor, getLocationLabel } from '@/lib/appointments';

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
  onEdit?: (appointment: Appointment) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (appointment: Appointment) => void;
}

export default function AppointmentCard({
  appointment,
  compact = false,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
  onClick,
}: AppointmentCardProps) {
  const startTime = format(new Date(appointment.start_time), 'HH:mm', { locale: fr });
  const endTime = format(new Date(appointment.end_time), 'HH:mm', { locale: fr });

  const patientName = appointment.patient
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
    : 'Sans patient';

  const practitionerName = appointment.practitioner?.profile
    ? `${appointment.practitioner.profile.first_name || ''} ${appointment.practitioner.profile.last_name || ''}`.trim()
    : 'Non assigné';

  const typeColor = getTypeColor(appointment.appointment_type);

  const statusVariant =
    appointment.status === 'completed'
      ? 'secondary'
      : appointment.status === 'cancelled' || appointment.status === 'no_show'
      ? 'destructive'
      : appointment.status === 'in_progress'
      ? 'default'
      : 'outline';

  if (compact) {
    return (
      <div
        data-testid="appointment-card"
        className={cn(
          'rounded-md p-2 text-xs cursor-pointer hover:opacity-90 transition-opacity',
          typeColor,
          'text-white'
        )}
        onClick={() => onClick?.(appointment)}
      >
        <div className="font-medium truncate">{appointment.title}</div>
        <div className="opacity-90 truncate">{patientName}</div>
        <div className="opacity-75">
          {startTime} - {endTime}
        </div>
        {appointment.is_pdsa && (
          <Badge variant="secondary" className="mt-1 text-[10px] px-1 py-0">
            PDSA
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="appointment-card"
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
        appointment.status === 'cancelled' && 'opacity-60'
      )}
      onClick={() => onClick?.(appointment)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-3 h-3 rounded-full', typeColor)} />
            <h4 className="font-medium truncate">{appointment.title}</h4>
            {appointment.is_pdsa && (
              <Badge variant="secondary" className="text-xs">
                PDSA
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {startTime} - {endTime}
            </span>
            {appointment.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {getLocationLabel(appointment.location)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <span>{patientName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{practitionerName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusVariant}>{getTypeLabel(appointment.appointment_type)}</Badge>

          {(onEdit || onComplete || onCancel || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(appointment);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {onComplete && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(appointment.id);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Terminer
                  </DropdownMenuItem>
                )}
                {onCancel && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(appointment.id);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(appointment.id);
                    }}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
