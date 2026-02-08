"use client";

import { useState, useEffect } from 'react';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { PatientLayout } from '@/components/patient-portal/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  Clock,
  Stethoscope,
  CheckCircle,
  History
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { getPatientInfo, getPatientAppointments, PatientInfo, PatientAppointment } from '@/lib/patientPortal';

export default function PatientProfile() {
  const { patient } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<PatientAppointment[]>([]);

  useEffect(() => {
    if (!patient?.patientId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [info, appointments] = await Promise.all([
          getPatientInfo(patient.patientId),
          getPatientAppointments(patient.patientId),
        ]);

        setPatientInfo(info);
        // Filter past appointments
        setAppointmentHistory(
          appointments.filter(apt => isPast(new Date(apt.start_time)))
        );
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [patient?.patientId]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Effectué</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'no_show':
        return <Badge className="bg-amber-100 text-amber-700">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const initials = patientInfo 
    ? `${patientInfo.first_name.charAt(0)}${patientInfo.last_name.charAt(0)}`.toUpperCase()
    : patient?.firstName?.charAt(0) || 'P';

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
            <p className="text-muted-foreground">Consultez vos informations personnelles</p>
          </div>
        </div>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">
              <User className="w-4 h-4 mr-2" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Historique RDV
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Sécurité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex items-center gap-6">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <h2 className="text-2xl font-bold">
                        {patientInfo?.first_name} {patientInfo?.last_name}
                      </h2>
                      <p className="text-muted-foreground">{patientInfo?.email}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Prénom</Label>
                      <p className="text-foreground font-medium">{patientInfo?.first_name || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Nom</Label>
                      <p className="text-foreground font-medium">{patientInfo?.last_name || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <p className="text-foreground font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {patientInfo?.email || '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Téléphone</Label>
                      <p className="text-foreground font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {patientInfo?.phone || '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Date de naissance</Label>
                      <p className="text-foreground font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {patientInfo?.dob 
                          ? format(new Date(patientInfo.dob), 'd MMMM yyyy', { locale: fr })
                          : '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Sexe</Label>
                      <p className="text-foreground font-medium">
                        {patientInfo?.sex === 'M' ? 'Masculin' : 
                         patientInfo?.sex === 'F' ? 'Féminin' : 
                         patientInfo?.sex || '-'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Info Note */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <p className="text-amber-800 text-sm">
                  Pour modifier vos informations personnelles, veuillez contacter votre équipe médicale 
                  ou vous rendre au secrétariat lors de votre prochaine visite.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Historique des rendez-vous
                </CardTitle>
                <CardDescription>
                  Vos consultations passées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                ) : appointmentHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Aucun rendez-vous passé</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointmentHistory.slice(0, 10).map((apt) => (
                      <div
                        key={apt.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-background"
                      >
                        <div className="w-14 h-14 rounded-lg bg-accent flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">
                            {format(new Date(apt.start_time), 'MMM', { locale: fr }).toUpperCase()}
                          </span>
                          <span className="text-lg font-bold">
                            {format(new Date(apt.start_time), 'd')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{apt.title || apt.appointment_type || 'Consultation'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Stethoscope className="w-4 h-4" />
                            {apt.practitioner_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {format(new Date(apt.start_time), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Sécurité du compte
                </CardTitle>
                <CardDescription>
                  Informations de sécurité de votre espace patient
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Compte sécurisé</p>
                      <p className="text-sm text-green-700">
                        Votre compte est protégé par un code patient unique
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Votre code patient</h3>
                  <p className="text-sm text-muted-foreground">
                    Ce code vous permet de vous connecter à votre espace patient.
                    Ne le partagez avec personne.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-lg tracking-widest bg-accent px-4 py-2 rounded-lg">
                      ••••••••
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Contactez votre équipe médicale pour obtenir un nouveau code
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Session actuelle</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Connexion actuelle</p>
                          <p className="text-xs text-muted-foreground">
                            Connecté en tant que {patient?.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Actif</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PatientLayout>
  );
}
