"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Search, 
  Copy,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  FileText,
  Clock
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { CPTSProfessional, CPTSMeeting, formatCPTSDirectory } from '@/lib/ipaFormatter';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mock data
const mockProfessionals: CPTSProfessional[] = [
  { id: '1', name: 'Dr. Martin Pierre', profession: 'Médecin généraliste', phone: '01 23 45 67 89', email: 'dr.martin@email.com', address: '12 rue de la Santé, 75014 Paris' },
  { id: '2', name: 'Dr. Dupont Marie', profession: 'Médecin généraliste', specialty: 'Gériatrie', phone: '01 23 45 67 90', email: 'dr.dupont@email.com' },
  { id: '3', name: 'Dr. Bernard Jean', profession: 'Cardiologue', phone: '01 23 45 67 91', email: 'dr.bernard@email.com' },
  { id: '4', name: 'Dr. Petit Sophie', profession: 'Endocrinologue', phone: '01 23 45 67 92' },
  { id: '5', name: 'Mme Durand Claire', profession: 'Infirmière libérale', phone: '06 12 34 56 78' },
  { id: '6', name: 'M. Moreau Paul', profession: 'Infirmier libéral', phone: '06 12 34 56 79' },
  { id: '7', name: 'Mme Leroy Anne', profession: 'Kinésithérapeute', phone: '01 23 45 67 93' },
  { id: '8', name: 'M. Dubois Marc', profession: 'Pharmacien', phone: '01 23 45 67 94', address: 'Pharmacie du Centre, 5 place de la Mairie' },
  { id: '9', name: 'Mme Simon Isabelle', profession: 'Diététicienne', phone: '06 12 34 56 80' },
  { id: '10', name: 'M. Laurent Thomas', profession: 'Podologue', phone: '01 23 45 67 95' },
];

const mockMeetings: CPTSMeeting[] = [
  { id: '1', title: 'Réunion plénière CPTS', date: format(addDays(new Date(), 5), "yyyy-MM-dd'T'18:30:00"), location: 'Maison de santé', attendees_count: 25 },
  { id: '2', title: 'Commission parcours diabète', date: format(addDays(new Date(), 12), "yyyy-MM-dd'T'19:00:00"), location: 'Visioconférence', attendees_count: 10 },
  { id: '3', title: 'Formation gestion cas complexes', date: format(addDays(new Date(), 20), "yyyy-MM-dd'T'09:00:00"), location: 'Salle de formation MSP', attendees_count: 15 },
];

const mockDocuments = [
  { id: '1', title: 'Charte CPTS 2024', date: '2024-01-15', type: 'pdf' },
  { id: '2', title: 'Protocole parcours insuffisance cardiaque', date: '2024-01-10', type: 'pdf' },
  { id: '3', title: 'Annuaire complet CPTS', date: '2024-01-05', type: 'xlsx' },
  { id: '4', title: 'Compte-rendu réunion janvier', date: '2024-01-20', type: 'pdf' },
];

interface ProfessionalCardProps {
  professional: CPTSProfessional;
}

function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const contactInfo = [
    professional.name,
    professional.profession + (professional.specialty ? ` (${professional.specialty})` : ''),
    professional.phone ? `Tél: ${professional.phone}` : null,
    professional.email ? `Email: ${professional.email}` : null,
    professional.address ? `Adresse: ${professional.address}` : null,
  ].filter(Boolean).join('\n');

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {professional.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-medium">{professional.name}</p>
          <p className="text-sm text-muted-foreground">
            {professional.profession}
            {professional.specialty && <span className="text-xs"> • {professional.specialty}</span>}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {professional.phone && (
              <a href={`tel:${professional.phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Phone className="h-3 w-3" />
                {professional.phone}
              </a>
            )}
            {professional.email && (
              <a href={`mailto:${professional.email}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Mail className="h-3 w-3" />
                Email
              </a>
            )}
          </div>
        </div>
      </div>
      <CopyToClipboard
        text={contactInfo}
        variant="ghost"
        size="icon"
      />
    </div>
  );
}

interface MeetingCardProps {
  meeting: CPTSMeeting;
}

function MeetingCard({ meeting }: MeetingCardProps) {
  const meetingDate = format(new Date(meeting.date), 'EEEE dd MMMM à HH:mm', { locale: fr });

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{meeting.title}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
        text={`${meeting.title}\n${meetingDate}${meeting.location ? `\nLieu: ${meeting.location}` : ''}`}
        variant="ghost"
        size="icon"
      />
    </div>
  );
}

export function CPTSRelationsSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [professionFilter, setProfessionFilter] = useState<string>('all');

  const professionals = mockProfessionals;
  const meetings = mockMeetings;
  const documents = mockDocuments;

  // Get unique professions
  const professions = [...new Set(professionals.map(p => p.profession))];

  const filteredProfessionals = professionals.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.profession.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfession = professionFilter === 'all' || p.profession === professionFilter;
    return matchesSearch && matchesProfession;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Relations CPTS
            </CardTitle>
            <CardDescription>
              Annuaire des professionnels et réunions du territoire
            </CardDescription>
          </div>
          <CopyToClipboard
            text={formatCPTSDirectory(professionals)}
            label="Copier annuaire"
            variant="outline"
            icon={<Copy className="h-4 w-4" />}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="annuaire">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="annuaire">
              <Users className="h-4 w-4 mr-2" />
              Annuaire ({professionals.length})
            </TabsTrigger>
            <TabsTrigger value="reunions">
              <Calendar className="h-4 w-4 mr-2" />
              Réunions ({meetings.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="annuaire" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un professionnel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="all">Toutes professions</option>
                {professions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Professionals list */}
            <div className="grid gap-3 md:grid-cols-2">
              {filteredProfessionals.map(professional => (
                <ProfessionalCard key={professional.id} professional={professional} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reunions" className="mt-4 space-y-3">
            {meetings.length > 0 ? (
              meetings.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucune réunion programmée</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4 space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.date), 'dd/MM/yyyy', { locale: fr })} • {doc.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Télécharger
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
