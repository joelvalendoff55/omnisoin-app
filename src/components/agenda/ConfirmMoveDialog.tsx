"use client";

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Appointment } from '@/lib/appointments';

interface ConfirmMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  newStartTime: Date | null;
  newEndTime: Date | null;
  onConfirm: () => void;
}

export default function ConfirmMoveDialog({
  open,
  onOpenChange,
  appointment,
  newStartTime,
  newEndTime,
  onConfirm,
}: ConfirmMoveDialogProps) {
  if (!appointment || !newStartTime || !newEndTime) return null;

  const oldStart = new Date(appointment.start_time);
  const oldEnd = new Date(appointment.end_time);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Déplacer le rendez-vous ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Voulez-vous déplacer le rendez-vous <strong>{appointment.title}</strong> ?
            </p>
            <div className="bg-muted rounded-md p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Ancien horaire :</span>
                <span className="font-medium">
                  {format(oldStart, 'EEEE d MMMM', { locale: fr })} de{' '}
                  {format(oldStart, 'HH:mm')} à {format(oldEnd, 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nouvel horaire :</span>
                <span className="font-medium text-primary">
                  {format(newStartTime, 'EEEE d MMMM', { locale: fr })} de{' '}
                  {format(newStartTime, 'HH:mm')} à {format(newEndTime, 'HH:mm')}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
