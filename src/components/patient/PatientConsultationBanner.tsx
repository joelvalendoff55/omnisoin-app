"use client";

import { useState } from 'react';
import { usePatientConsultationContext } from '@/hooks/usePatientConsultationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { User, Calendar, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PatientConsultationBanner() {
  const { context, clearContext, isActive } = usePatientConsultationContext();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isActive || !context.patient) {
    return null;
  }

  const { patient, startedAt } = context;

  const handleChangePatient = () => {
    setShowConfirmDialog(true);
  };

  const confirmChange = () => {
    clearContext();
    setShowConfirmDialog(false);
  };

  const consultationDuration = startedAt
    ? formatDistanceToNow(new Date(startedAt), { locale: fr, addSuffix: false })
    : null;

  const formattedDate = startedAt
    ? format(new Date(startedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })
    : null;

  return (
    <>
      <Card className="sticky top-0 z-50 mb-6 border-primary/30 bg-primary/5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 p-4">
          {/* Patient Info */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {patient.first_name} {patient.last_name}
                </h3>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <span className="mr-1 h-2 w-2 rounded-full bg-white animate-pulse" />
                  Consultation en cours
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {formattedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formattedDate}
                  </span>
                )}
                {consultationDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Durée: {consultationDuration}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            onClick={handleChangePatient}
            className="gap-2 border-primary/30 hover:bg-primary/10"
          >
            <RefreshCw className="h-4 w-4" />
            Changer de patient
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Changer de patient
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir terminer la consultation en cours avec{' '}
              <strong>
                {patient.first_name} {patient.last_name}
              </strong>{' '}
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Annuler
            </Button>
            <Button onClick={confirmChange}>
              Confirmer le changement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
