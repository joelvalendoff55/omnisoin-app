import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, AlertTriangle, CheckCircle, MessageSquare, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Appointment, getTypeColor } from '@/lib/appointments';
import { getPractitionerColor } from './AgendaFilters';

interface DraggableAppointmentCardProps {
  appointment: Appointment;
  practitionerIndex?: number;
  isConflict?: boolean;
  patientArrived?: boolean;
  onClick?: (appointment: Appointment) => void;
  onDoubleClick?: (appointment: Appointment) => void;
}

export default function DraggableAppointmentCard({
  appointment,
  practitionerIndex = 0,
  isConflict = false,
  patientArrived = false,
  onClick,
  onDoubleClick,
}: DraggableAppointmentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: appointment.id,
    data: {
      type: 'appointment',
      appointment,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startTime = format(new Date(appointment.start_time), 'HH:mm', { locale: fr });
  const endTime = format(new Date(appointment.end_time), 'HH:mm', { locale: fr });

  const patientName = appointment.patient
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
    : 'Sans patient';

  const isUrgent = appointment.appointment_type === 'emergency';
  const typeColor = getTypeColor(appointment.appointment_type);
  const practitionerColor = getPractitionerColor(practitionerIndex);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="appointment-card"
      className={cn(
        'group rounded-md p-2 text-xs cursor-pointer transition-all relative',
        typeColor,
        'text-white',
        isDragging && 'opacity-50 shadow-lg scale-105',
        isConflict && 'ring-2 ring-destructive ring-offset-1',
        patientArrived && 'ring-2 ring-green-500 ring-offset-1'
      )}
      onClick={() => onClick?.(appointment)}
      onDoubleClick={() => onDoubleClick?.(appointment)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab"
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {/* Practitioner color indicator */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', practitionerColor)} />

      <div className="pl-3">
        {/* Title and badges */}
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <span className="font-medium truncate flex-1">{appointment.title}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isUrgent && (
              <AlertTriangle className="h-3 w-3 text-yellow-300" />
            )}
            {appointment.reminder_sent && (
              <MessageSquare className="h-3 w-3 text-white/70" />
            )}
            {patientArrived && (
              <CheckCircle className="h-3 w-3 text-green-300" />
            )}
          </div>
        </div>

        {/* Patient name */}
        <div className="opacity-90 truncate">{patientName}</div>

        {/* Time */}
        <div className="flex items-center gap-1 opacity-75 mt-0.5">
          <Clock className="h-3 w-3" />
          <span>{startTime} - {endTime}</span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1 mt-1">
          {appointment.is_pdsa && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              PDSA
            </Badge>
          )}
          {isConflict && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
              Conflit
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
