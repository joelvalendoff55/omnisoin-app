import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { useAdminPatientContext } from '@/hooks/useAdminPatientContext';
import { PatientLayout } from '@/components/patient-portal/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  MessageSquare, 
  FileText, 
  Clock, 
  User,
  ChevronRight,
  CalendarCheck,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  getPatientAppointments, 
  getPatientMessages, 
  getPatientDocuments,
  PatientAppointment,
  PatientMessage,
} from '@/lib/patientPortal';

export default function PatientDashboard() {
  const { patient } = usePatientAuth();
  const { isAdminMode, selectedPatient } = useAdminPatientContext();
  
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);

  // Determine effective patient info based on mode
  const effectivePatientId = isAdminMode ? selectedPatient?.id : patient?.patientId;
  const effectiveFirstName = isAdminMode ? selectedPatient?.first_name : patient?.firstName;
  const effectiveLastName = isAdminMode ? selectedPatient?.last_name : patient?.lastName;

  useEffect(() => {
    // In admin mode without patient selection, don't load data
    if (isAdminMode && !selectedPatient) {
      setLoading(false);
      return;
    }
    
    if (!effectivePatientId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [aptData, msgData, docData] = await Promise.all([
          getPatientAppointments(effectivePatientId),
          getPatientMessages(effectivePatientId),
          getPatientDocuments(effectivePatientId),
        ]);

        setAppointments(aptData);
        setMessages(msgData);
        setDocumentsCount(docData.length);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [effectivePatientId, isAdminMode, selectedPatient]);

  const upcomingAppointments = appointments
    .filter(apt => isFuture(new Date(apt.start_time)) && apt.status !== 'cancelled')
    .slice(0, 3);

  const unreadMessages = messages.filter(
    m => !m.is_read && m.direction === 'practitioner_to_patient'
  );

  const recentMessages = messages.slice(0, 3);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmé</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Planifié</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  // Get unique practitioners count
  const practitionersSet = new Set(appointments.map(a => a.practitioner_id).filter(Boolean));

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Admin mode: prompt to select patient */}
        {isAdminMode && !selectedPatient && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Sélectionnez un patient</h3>
                  <p className="text-sm text-amber-700">
                    Utilisez le sélecteur de patient ci-dessus pour consulter le dossier d'un patient.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {isAdminMode 
                  ? selectedPatient 
                    ? `Dossier de ${effectiveFirstName} ${effectiveLastName}`
                    : 'Portail Patient - Mode Administrateur'
                  : `Bonjour, ${effectiveFirstName} 👋`}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdminMode 
                  ? selectedPatient 
                    ? 'Consultation du dossier patient'
                    : 'Sélectionnez un patient pour consulter son dossier'
                  : 'Bienvenue sur votre espace patient'}
              </p>
            </div>
            {effectivePatientId && (
              <Button asChild size="lg" className="shadow-lg">
                <Link to="/patient-portal/appointments">
                  <Calendar className="w-5 h-5 mr-2" />
                  {isAdminMode ? 'Voir les RDV' : 'Prendre RDV'}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{upcomingAppointments.length}</p>
                  <p className="text-sm text-blue-600">RDV à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-700">{unreadMessages.length}</p>
                  <p className="text-sm text-orange-600">Messages non lus</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{documentsCount}</p>
                  <p className="text-sm text-green-600">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700">{practitionersSet.size}</p>
                  <p className="text-sm text-purple-600">Praticiens</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Prochains rendez-vous
                </CardTitle>
                <CardDescription>Vos consultations à venir</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/patient-portal/appointments">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </>
              ) : upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {format(new Date(apt.start_time), 'MMM', { locale: fr }).toUpperCase()}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {format(new Date(apt.start_time), 'd')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{apt.title || apt.appointment_type || 'Consultation'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="w-4 h-4" />
                            {apt.practitioner_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {format(new Date(apt.start_time), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun rendez-vous à venir</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link to="/patient-portal/appointments">Prendre un rendez-vous</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Messages récents
                  {unreadMessages.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{unreadMessages.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Échanges avec votre équipe médicale</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/patient-portal/messages">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </>
              ) : recentMessages.length > 0 ? (
                recentMessages.map((msg) => {
                  const isUnread = !msg.is_read && msg.direction === 'practitioner_to_patient';
                  return (
                    <Link 
                      key={msg.id}
                      to="/patient-portal/messages"
                      className={`block p-4 rounded-xl border transition-all hover:shadow-md ${
                        isUnread 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-accent/30 border-border/50 hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                            <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                              {msg.practitioner_name}
                            </p>
                          </div>
                          <p className={`text-sm truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {msg.subject || 'Sans objet'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {msg.content.substring(0, 100)}...
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun message</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild>
                <Link to="/patient-portal/appointments">
                  <Calendar className="w-6 h-6 text-primary" />
                  <span>Prendre RDV</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild>
                <Link to="/patient-portal/messages">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <span>Nouveau message</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild>
                <Link to="/patient-portal/documents">
                  <FileText className="w-6 h-6 text-primary" />
                  <span>Mes documents</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild>
                <Link to="/patient-portal/profile">
                  <User className="w-6 h-6 text-primary" />
                  <span>Mon profil</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
}
