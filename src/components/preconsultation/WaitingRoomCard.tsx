"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Clock,
  User,
  Phone,
  AlertTriangle,
  ChevronDown,
  Stethoscope,
  CheckCircle,
  UserCheck,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Preconsultation,
  WaitingStatus,
  PreconsultationPriority,
  WAITING_STATUS_CONFIG,
  PRIORITY_CONFIG,
  getWaitingDuration,
} from '@/lib/preconsultations';

interface WaitingRoomCardProps {
  preconsultation: Preconsultation;
  onStatusChange: (id: string, status: WaitingStatus) => void;
  onPriorityChange: (id: string, priority: PreconsultationPriority) => void;
  onClick?: () => void;
  loading?: boolean;
}

const StatusIcon = ({ status }: { status: WaitingStatus }) => {
  switch (status) {
    case 'arrived':
      return <UserCheck className="h-4 w-4" />;
    case 'waiting':
      return <Clock className="h-4 w-4" />;
    case 'in_progress':
      return <Stethoscope className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export function WaitingRoomCard({
  preconsultation,
  onStatusChange,
  onPriorityChange,
  onClick,
  loading,
}: WaitingRoomCardProps) {
  const [waitingTime, setWaitingTime] = useState(getWaitingDuration(preconsultation.arrival_time));
  const statusConfig = WAITING_STATUS_CONFIG[preconsultation.waiting_status];
  const priorityConfig = PRIORITY_CONFIG[preconsultation.priority];

  // Update waiting time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingTime(getWaitingDuration(preconsultation.arrival_time));
    }, 60000);

    return () => clearInterval(interval);
  }, [preconsultation.arrival_time]);

  const isUrgent = preconsultation.priority === 'urgent';
  const isEmergency = preconsultation.priority === 'emergency';

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer border-l-4',
        isEmergency && 'border-l-red-500 bg-red-50/30',
        isUrgent && !isEmergency && 'border-l-orange-500 bg-orange-50/30',
        !isUrgent && !isEmergency && 'border-l-slate-300'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold truncate">
                {preconsultation.patient?.first_name} {preconsultation.patient?.last_name}
              </span>
              {isEmergency && (
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              )}
            </div>

            {preconsultation.patient?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Phone className="h-3 w-3" />
                <span>{preconsultation.patient.phone}</span>
              </div>
            )}

            {preconsultation.initial_symptoms && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {preconsultation.initial_symptoms}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {/* Status Badge */}
              <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
                <StatusIcon status={preconsultation.waiting_status} />
                {statusConfig.label}
              </Badge>

              {/* Priority Badge */}
              <Badge variant="outline" className={cn('gap-1', priorityConfig.bgColor, priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>

          {/* Right Side - Time & Actions */}
          <div className="flex flex-col items-end gap-2">
            {/* Waiting Time */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md',
                    waitingTime.minutes > 60 && 'bg-red-100 text-red-700',
                    waitingTime.minutes > 30 && waitingTime.minutes <= 60 && 'bg-amber-100 text-amber-700',
                    waitingTime.minutes <= 30 && 'bg-green-100 text-green-700'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {waitingTime.formatted}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Arrivée : {format(new Date(preconsultation.arrival_time), 'HH:mm', { locale: fr })}</p>
              </TooltipContent>
            </Tooltip>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => onStatusChange(preconsultation.id, 'waiting')}
                  disabled={preconsultation.waiting_status === 'waiting'}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mettre en attente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange(preconsultation.id, 'in_progress')}
                  disabled={preconsultation.waiting_status === 'in_progress'}
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Démarrer pré-consultation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange(preconsultation.id, 'completed')}
                  disabled={preconsultation.waiting_status === 'completed'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Terminer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => onPriorityChange(preconsultation.id, 'normal')}
                  disabled={preconsultation.priority === 'normal'}
                >
                  Priorité normale
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onPriorityChange(preconsultation.id, 'urgent')}
                  disabled={preconsultation.priority === 'urgent'}
                  className="text-orange-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Urgent
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onPriorityChange(preconsultation.id, 'emergency')}
                  disabled={preconsultation.priority === 'emergency'}
                  className="text-red-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Urgence vitale
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
