"use client";

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User, Phone, Stethoscope, CheckCircle, XCircle, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { QueueActionButtons } from './QueueActionButtons';
import { usePatientJourney } from '@/hooks/usePatientJourney';
import {
  PatientJourneyStep,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/patientJourney';
import { getWaitingTime } from '@/lib/queue';
import type { QueueEntry } from '@/lib/queue';

interface PatientJourneyCardProps {
  entry: QueueEntry;
  onUpdate: () => void;
}

const STEP_ICONS: Record<string, typeof Clock> = {
  present: User,
  waiting: Clock,
  called: Phone,
  in_consultation: Stethoscope,
  awaiting_exam: Clock,
  completed: CheckCircle,
  closed: CheckCircle,
  cancelled: XCircle,
  no_show: UserX,
};

export function PatientJourneyCard({ entry, onUpdate }: PatientJourneyCardProps) {
  const [steps, setSteps] = useState<PatientJourneyStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const {
    loading,
    loadSteps,
    callPatient,
    startConsultation,
    completeConsultation,
    markNoShow,
    cancelVisit,
    requeue,
  } = usePatientJourney();

  useEffect(() => {
    const fetchSteps = async () => {
      setLoadingSteps(true);
      try {
        await loadSteps(entry.id);
      } finally {
        setLoadingSteps(false);
      }
    };
    fetchSteps();
  }, [entry.id, loadSteps]);

  const status = entry.status || 'waiting';
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  const waitingTime = entry.arrival_time ? getWaitingTime(entry.arrival_time) : null;

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
      onUpdate();
    } catch {
      // Error already handled in hook
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {entry.patient?.first_name} {entry.patient?.last_name}
            </CardTitle>
            {entry.patient?.phone && (
              <p className="text-sm text-muted-foreground mt-1">
                {entry.patient.phone}
              </p>
            )}
          </div>
          <Badge className={`${statusColor} border`}>{statusLabel}</Badge>
        </div>

        {/* Waiting time */}
        {status === 'waiting' && waitingTime && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
            <Clock className="h-4 w-4" />
            <span>Attente: {waitingTime.formatted}</span>
          </div>
        )}

        {/* Reason */}
        {entry.consultation_reason && (
          <Badge 
            variant="outline" 
            className="mt-2 w-fit"
            style={{ 
              borderColor: entry.consultation_reason.color || undefined,
              color: entry.consultation_reason.color || undefined 
            }}
          >
            {entry.consultation_reason.label}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Actions */}
        <QueueActionButtons
          entry={entry}
          loading={loading}
          onCall={() => handleAction(() => callPatient(entry))}
          onStart={() => handleAction(() => startConsultation(entry))}
          onComplete={() => handleAction(() => completeConsultation(entry))}
          onCancel={() => handleAction(() => cancelVisit(entry))}
          onNoShow={() => handleAction(() => markNoShow(entry))}
          onRequeue={() => handleAction(() => requeue(entry))}
        />

        {/* Journey Timeline */}
        {loadingSteps ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : steps.length > 0 ? (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Historique</h4>
              <JourneyTimeline steps={steps} />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function JourneyTimeline({ steps }: { steps: PatientJourneyStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.step_type] || Clock;
        const isLast = index === steps.length - 1;
        const stepLabel = STATUS_LABELS[step.step_type] || step.step_type;

        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full ${isLast ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Icon className="h-3 w-3" />
              </div>
              {!isLast && (
                <div className="w-px h-full bg-border min-h-[20px]" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-sm font-medium">{stepLabel}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(step.step_at), 'HH:mm', { locale: fr })}
                {' · '}
                {formatDistanceToNow(new Date(step.step_at), { addSuffix: true, locale: fr })}
              </p>
              {step.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {step.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
