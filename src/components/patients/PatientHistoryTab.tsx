"use client";

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle, UserX, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/patientJourney';

interface QueueVisit {
  id: string;
  arrival_time: string | null;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string | null;
  reason: string | null;
  notes: string | null;
  consultation_reason?: {
    label: string;
    color: string | null;
  } | null;
  assigned_team_member?: {
    job_title: string;
    user_id: string;
  } | null;
}

interface PatientHistoryTabProps {
  patientId: string;
  structureId: string;
}

export function PatientHistoryTab({ patientId, structureId }: PatientHistoryTabProps) {
  const [visits, setVisits] = useState<QueueVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('patient_queue')
          .select(`
            id,
            arrival_time,
            called_at,
            started_at,
            completed_at,
            status,
            reason,
            notes,
            consultation_reason:consultation_reasons(label, color),
            assigned_team_member:team_members(job_title, user_id)
          `)
          .eq('patient_id', patientId)
          .eq('structure_id', structureId)
          .order('arrival_time', { ascending: false })
          .limit(50);

        if (error) throw error;
        setVisits((data || []) as unknown as QueueVisit[]);
      } catch (error) {
        console.error('Error fetching patient visits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [patientId, structureId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune visite enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-4 pr-4">
        {visits.map((visit) => (
          <VisitCard key={visit.id} visit={visit} />
        ))}
      </div>
    </ScrollArea>
  );
}

function VisitCard({ visit }: { visit: QueueVisit }) {
  const status = visit.status || 'waiting';
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.waiting;

  const arrivalDate = visit.arrival_time ? new Date(visit.arrival_time) : null;
  const completedDate = visit.completed_at ? new Date(visit.completed_at) : null;

  // Calculate duration if completed
  let duration: string | null = null;
  if (arrivalDate && completedDate) {
    const diffMs = completedDate.getTime() - arrivalDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      duration = `${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      duration = `${hours}h ${mins}min`;
    }
  }

  const StatusIcon = status === 'completed' ? CheckCircle 
    : status === 'cancelled' ? XCircle 
    : status === 'no_show' ? UserX 
    : Clock;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${
              status === 'completed' ? 'text-green-600' 
              : status === 'cancelled' ? 'text-gray-500'
              : status === 'no_show' ? 'text-red-500'
              : 'text-yellow-600'
            }`} />
            <CardTitle className="text-base">
              {arrivalDate ? format(arrivalDate, 'EEEE d MMMM yyyy', { locale: fr }) : 'Date inconnue'}
            </CardTitle>
          </div>
          <Badge className={`${statusColor} border`}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {arrivalDate && (
            <span>Arrivée: {format(arrivalDate, 'HH:mm', { locale: fr })}</span>
          )}
          {visit.called_at && (
            <span>Appelé: {format(new Date(visit.called_at), 'HH:mm', { locale: fr })}</span>
          )}
          {visit.started_at && (
            <span>Début: {format(new Date(visit.started_at), 'HH:mm', { locale: fr })}</span>
          )}
          {completedDate && (
            <span>Fin: {format(completedDate, 'HH:mm', { locale: fr })}</span>
          )}
          {duration && (
            <span className="font-medium text-foreground">Durée totale: {duration}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {visit.consultation_reason && (
            <Badge 
              variant="outline"
              style={{ 
                borderColor: visit.consultation_reason.color || undefined,
                color: visit.consultation_reason.color || undefined 
              }}
            >
              {visit.consultation_reason.label}
            </Badge>
          )}
          {visit.reason && !visit.consultation_reason && (
            <Badge variant="outline">{visit.reason}</Badge>
          )}
        </div>

        {visit.notes && (
          <p className="text-sm text-muted-foreground italic">
            {visit.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
