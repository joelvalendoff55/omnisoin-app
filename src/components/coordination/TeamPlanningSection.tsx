import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarDays, 
  Plus, 
  Users, 
  Clock,
  MapPin,
  Copy,
  UserMinus,
  Calendar as CalendarIcon
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { TeamAbsence, TeamMeeting, formatTeamAbsences, formatTeamMeetings } from '@/lib/coordinateurFormatter';
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const absenceTypeConfig = {
  conge: { label: 'Congés', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  maladie: { label: 'Maladie', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  formation: { label: 'Formation', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
};

const meetingTypeConfig = {
  equipe: { label: 'Réunion équipe', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rcp: { label: 'RCP', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  formation: { label: 'Formation', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
};

// Mock data
const mockAbsences: TeamAbsence[] = [
  {
    id: '1',
    user_name: 'Dr. Martin',
    absence_type: 'conge',
    start_date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    status: 'approved',
  },
  {
    id: '2',
    user_name: 'Sophie Dupont',
    absence_type: 'formation',
    start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    status: 'approved',
  },
  {
    id: '3',
    user_name: 'Marie Bernard',
    absence_type: 'maladie',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'approved',
  },
];

const mockMeetings: TeamMeeting[] = [
  {
    id: '1',
    title: 'Réunion équipe hebdomadaire',
    meeting_date: format(addDays(new Date(), 2), "yyyy-MM-dd'T'09:00:00"),
    meeting_type: 'equipe',
    location: 'Salle de réunion A',
    attendees_count: 8,
  },
  {
    id: '2',
    title: 'RCP - Cas complexes',
    meeting_date: format(addDays(new Date(), 5), "yyyy-MM-dd'T'14:00:00"),
    meeting_type: 'rcp',
    location: 'Visioconférence',
    attendees_count: 5,
  },
  {
    id: '3',
    title: 'Formation nouvelles procédures',
    meeting_date: format(addDays(new Date(), 7), "yyyy-MM-dd'T'10:00:00"),
    meeting_type: 'formation',
    location: 'Salle de formation',
    attendees_count: 12,
  },
];

interface AbsenceCardProps {
  absence: TeamAbsence;
}

function AbsenceCard({ absence }: AbsenceCardProps) {
  const config = absenceTypeConfig[absence.absence_type];
  const startDate = format(parseISO(absence.start_date), 'dd/MM/yyyy', { locale: fr });
  const endDate = format(parseISO(absence.end_date), 'dd/MM/yyyy', { locale: fr });
  const isSameDay = absence.start_date === absence.end_date;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <UserMinus className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{absence.user_name}</p>
          <div className="flex items-center gap-2 text-sm">
            <Badge className={config.color}>{config.label}</Badge>
            <span className="text-muted-foreground">
              {isSameDay ? startDate : `${startDate} - ${endDate}`}
            </span>
          </div>
        </div>
      </div>
      <CopyToClipboard
        text={`${absence.user_name}: ${config.label} du ${startDate} au ${endDate}`}
        variant="ghost"
        size="icon"
      />
    </div>
  );
}

interface MeetingCardProps {
  meeting: TeamMeeting;
}

function MeetingCard({ meeting }: MeetingCardProps) {
  const config = meetingTypeConfig[meeting.meeting_type];
  const meetingDate = format(parseISO(meeting.meeting_date), 'EEEE dd MMMM à HH:mm', { locale: fr });

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{meeting.title}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge className={config.color}>{config.label}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meetingDate}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {meeting.location}
              </span>
            )}
            {meeting.attendees_count && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meeting.attendees_count}
              </span>
            )}
          </div>
        </div>
      </div>
      <CopyToClipboard
        text={`${meeting.title}\n${meetingDate}${meeting.location ? `\nLieu: ${meeting.location}` : ''}${meeting.attendees_count ? `\nParticipants: ${meeting.attendees_count}` : ''}`}
        variant="ghost"
        size="icon"
      />
    </div>
  );
}

export function TeamPlanningSection() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // In production, these would come from hooks/API
  const absences = mockAbsences;
  const meetings = mockMeetings;

  // Get dates with absences for calendar highlighting
  const absenceDates = absences.flatMap(absence => {
    const dates: Date[] = [];
    let current = parseISO(absence.start_date);
    const end = parseISO(absence.end_date);
    while (current <= end) {
      dates.push(new Date(current));
      current = addDays(current, 1);
    }
    return dates;
  });

  // Get meeting dates
  const meetingDates = meetings.map(m => parseISO(m.meeting_date));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Planning équipe
            </CardTitle>
            <CardDescription>
              Absences et réunions programmées
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <CopyToClipboard
              text={`${formatTeamAbsences(absences)}\n\n${formatTeamMeetings(meetings)}`}
              label="Copier planning"
              variant="outline"
              icon={<Copy className="h-4 w-4" />}
            />
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle absence
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={fr}
              modifiers={{
                absence: absenceDates,
                meeting: meetingDates,
              }}
              modifiersStyles={{
                absence: { backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' },
                meeting: { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' },
              }}
              className="rounded-md border"
            />
          </div>

          {/* Lists */}
          <div>
            <Tabs defaultValue="absences">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="absences">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Absences ({absences.length})
                </TabsTrigger>
                <TabsTrigger value="meetings">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Réunions ({meetings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="absences" className="mt-4 space-y-3">
                {absences.length > 0 ? (
                  absences.map(absence => (
                    <AbsenceCard key={absence.id} absence={absence} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserMinus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune absence programmée</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="meetings" className="mt-4 space-y-3">
                {meetings.length > 0 ? (
                  meetings.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune réunion programmée</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Google Calendar integration notice */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-dashed">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Intégration Google Calendar à venir - Synchronisation automatique des événements</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
