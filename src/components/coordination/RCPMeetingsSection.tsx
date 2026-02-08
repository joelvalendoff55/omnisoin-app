"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Plus, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RCPMeeting } from '@/hooks/useRCPMeetings';
import { RCPFormDialog } from './RCPFormDialog';

const statusConfig = {
  planned: { label: 'Planifiée', variant: 'outline' as const },
  in_progress: { label: 'En cours', variant: 'default' as const },
  completed: { label: 'Terminée', variant: 'secondary' as const },
  cancelled: { label: 'Annulée', variant: 'destructive' as const },
};

interface RCPMeetingsSectionProps {
  meetings: RCPMeeting[];
  loading: boolean;
  onCreateMeeting: (data: Omit<RCPMeeting, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'structure_id'>) => Promise<void>;
}

export function RCPMeetingsSection({ meetings, loading, onCreateMeeting }: RCPMeetingsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Réunions RCP</CardTitle>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Réunions RCP</CardTitle>
              </div>
              <CardDescription>Réunions de concertation pluriprofessionnelle</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle RCP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune réunion RCP planifiée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Patients</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting) => {
                  const status = statusConfig[meeting.status];
                  return (
                    <TableRow key={meeting.id}>
                      <TableCell className="font-medium">{meeting.title}</TableCell>
                      <TableCell>{formatDate(meeting.meeting_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{meeting.participants.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{meeting.patient_ids.length} patients</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RCPFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={onCreateMeeting}
      />
    </>
  );
}
