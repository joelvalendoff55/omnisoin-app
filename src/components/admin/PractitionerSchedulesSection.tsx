import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePractitionerSchedules, usePractitionerAbsences } from '@/hooks/useStructureAdmin';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { DAY_LABELS, ABSENCE_TYPES } from '@/lib/structureAdmin';
import { getJobTitleLabel } from '@/lib/team';
import { Calendar, Clock, Plus, Trash2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PractitionerSchedulesSection() {
  const { schedules, loading: schedulesLoading, addSchedule, removeSchedule } = usePractitionerSchedules();
  const { absences, loading: absencesLoading, addAbsence, removeAbsence } = usePractitionerAbsences();
  const { teamMembers: members, loading: membersLoading } = useTeamMembers();
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  
  const [newSchedule, setNewSchedule] = useState({
    team_member_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '18:00',
  });

  const [newAbsence, setNewAbsence] = useState({
    team_member_id: '',
    start_date: '',
    end_date: '',
    absence_type: 'conge',
    reason: '',
  });

  const loading = schedulesLoading || absencesLoading || membersLoading;

  // Group schedules by member
  const schedulesByMember = useMemo(() => {
    const grouped = new Map<string, typeof schedules>();
    schedules.forEach((s) => {
      const existing = grouped.get(s.team_member_id) || [];
      existing.push(s);
      grouped.set(s.team_member_id, existing);
    });
    return grouped;
  }, [schedules]);

  // Group absences by member
  const absencesByMember = useMemo(() => {
    const grouped = new Map<string, typeof absences>();
    absences.forEach((a) => {
      const existing = grouped.get(a.team_member_id) || [];
      existing.push(a);
      grouped.set(a.team_member_id, existing);
    });
    return grouped;
  }, [absences]);

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return 'Inconnu';
    const name = member.profile
      ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
      : 'Sans nom';
    return name || getJobTitleLabel(member.job_title);
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.team_member_id) return;
    await addSchedule(newSchedule);
    setScheduleDialogOpen(false);
    setNewSchedule({
      team_member_id: '',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '18:00',
    });
  };

  const handleAddAbsence = async () => {
    if (!newAbsence.team_member_id || !newAbsence.start_date || !newAbsence.end_date) return;
    await addAbsence(newAbsence);
    setAbsenceDialogOpen(false);
    setNewAbsence({
      team_member_id: '',
      start_date: '',
      end_date: '',
      absence_type: 'conge',
      reason: '',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reorder days: Monday first
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6">
      {/* Weekly Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Plannings hebdomadaires
            </CardTitle>
            <CardDescription>Créneaux de travail des praticiens</CardDescription>
          </div>
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un créneau
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau créneau</DialogTitle>
                <DialogDescription>Ajouter un créneau de travail pour un praticien</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Praticien</Label>
                  <Select
                    value={newSchedule.team_member_id}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, team_member_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un praticien" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {getMemberName(m.id)} - {getJobTitleLabel(m.job_title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jour</Label>
                  <Select
                    value={String(newSchedule.day_of_week)}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderedDays.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {DAY_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Début</Label>
                    <Input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin</Label>
                    <Input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddSchedule}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Weekly calendar grid */}
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-8 gap-2">
                {/* Header */}
                <div className="font-medium text-sm text-muted-foreground p-2">Praticien</div>
                {orderedDays.map((d) => (
                  <div key={d} className="font-medium text-sm text-center p-2 bg-muted rounded">
                    {DAY_LABELS[d].substring(0, 3)}
                  </div>
                ))}

                {/* Rows */}
                {members.map((member) => {
                  const memberSchedules = schedulesByMember.get(member.id) || [];
                  return (
                    <div key={member.id} className="contents">
                      <div className="text-sm p-2 flex items-center border-b">
                        <span className="truncate">{getMemberName(member.id)}</span>
                      </div>
                      {orderedDays.map((d) => {
                        const daySchedules = memberSchedules.filter((s) => s.day_of_week === d);
                        return (
                          <div key={d} className="p-1 border-b min-h-[60px]">
                            {daySchedules.map((s) => (
                              <div
                                key={s.id}
                                className="text-xs bg-primary/10 text-primary rounded p-1 mb-1 flex items-center justify-between group"
                              >
                                <span>
                                  {s.start_time.substring(0, 5)}-{s.end_time.substring(0, 5)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                  onClick={() => removeSchedule(s.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Absences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Absences
            </CardTitle>
            <CardDescription>Gestion des absences et indisponibilités</CardDescription>
          </div>
          <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Déclarer une absence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle absence</DialogTitle>
                <DialogDescription>Enregistrer une absence pour un praticien</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Praticien</Label>
                  <Select
                    value={newAbsence.team_member_id}
                    onValueChange={(v) => setNewAbsence({ ...newAbsence, team_member_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un praticien" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {getMemberName(m.id)} - {getJobTitleLabel(m.job_title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type d'absence</Label>
                  <Select
                    value={newAbsence.absence_type}
                    onValueChange={(v) => setNewAbsence({ ...newAbsence, absence_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ABSENCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={newAbsence.start_date}
                      onChange={(e) => setNewAbsence({ ...newAbsence, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={newAbsence.end_date}
                      onChange={(e) => setNewAbsence({ ...newAbsence, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motif (optionnel)</Label>
                  <Input
                    value={newAbsence.reason}
                    onChange={(e) => setNewAbsence({ ...newAbsence, reason: e.target.value })}
                    placeholder="Motif de l'absence"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAbsenceDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddAbsence}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune absence enregistrée
            </div>
          ) : (
            <div className="space-y-3">
              {absences.map((absence) => {
                const absenceType = ABSENCE_TYPES.find((t) => t.value === absence.absence_type);
                return (
                  <div
                    key={absence.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{getMemberName(absence.team_member_id)}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(absence.start_date), 'dd MMM yyyy', { locale: fr })} -{' '}
                          {format(new Date(absence.end_date), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      </div>
                      <Badge variant="secondary">{absenceType?.label || absence.absence_type}</Badge>
                      {absence.reason && (
                        <span className="text-sm text-muted-foreground">{absence.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAbsence(absence.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
