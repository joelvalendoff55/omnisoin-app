"use client";

import { useState, useEffect } from 'react';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { useAdminPatientContext } from '@/hooks/useAdminPatientContext';
import { PatientLayout } from '@/components/patient-portal/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format, addDays, isSameDay, startOfWeek, addWeeks, subWeeks, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  getPatientAppointments, 
  getAvailablePractitioners, 
  getConsultationReasons,
  PatientAppointment 
} from '@/lib/patientPortal';

interface Practitioner {
  id: string;
  name: string;
  specialty: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Reason {
  id: string;
  label: string;
  duration: number;
}

export default function PatientAppointments() {
  const { patient } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<PatientAppointment[]>([]);
  
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!patient?.patientId || !patient?.structureId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [practitionersData, reasonsData, appointmentsData] = await Promise.all([
          getAvailablePractitioners(patient.structureId!),
          getConsultationReasons(patient.structureId!),
          getPatientAppointments(patient.patientId),
        ]);

        setPractitioners(practitionersData);
        setReasons(reasonsData.length > 0 ? reasonsData : [
          { id: 'general', label: 'Consultation générale', duration: 20 },
          { id: 'suivi', label: 'Suivi de traitement', duration: 15 },
          { id: 'renouvellement', label: 'Renouvellement ordonnance', duration: 10 },
        ]);
        setExistingAppointments(appointmentsData);
      } catch (error) {
        console.error('Error loading appointment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [patient?.patientId, patient?.structureId]);

  useEffect(() => {
    if (selectedPractitioner && selectedReason) {
      loadTimeSlots();
    }
  }, [selectedPractitioner, selectedReason, weekStart]);

  const loadTimeSlots = () => {
    setLoadingSlots(true);
    // Simulate loading time slots - in production, this would call an API
    setTimeout(() => {
      const slots: Record<string, TimeSlot[]> = {};
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();
        
        // No slots on weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          slots[dateKey] = [];
          continue;
        }
        
        // No slots for past dates
        if (!isFuture(date)) {
          slots[dateKey] = [];
          continue;
        }
        
        // Generate random available slots
        const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
        slots[dateKey] = times.map(time => ({
          time,
          available: Math.random() > 0.4,
        }));
      }
      setTimeSlots(slots);
      setLoadingSlots(false);
    }, 600);
  };

  const handleBookAppointment = async () => {
    setBooking(true);
    // Simulate booking - in production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setBooking(false);
    setConfirmDialogOpen(false);
    toast.success('Demande de rendez-vous envoyée !', {
      description: `Le ${format(selectedDate!, 'd MMMM yyyy', { locale: fr })} à ${selectedTime}. Vous recevrez une confirmation.`,
    });
    // Reset selection
    setSelectedDate(undefined);
    setSelectedTime('');
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedPractitionerData = practitioners.find(p => p.id === selectedPractitioner);
  const selectedReasonData = reasons.find(r => r.id === selectedReason);

  // Get upcoming appointments
  const upcomingAppointments = existingAppointments
    .filter(apt => isFuture(new Date(apt.start_time)) && apt.status !== 'cancelled')
    .slice(0, 3);

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prendre rendez-vous</h1>
          <p className="text-muted-foreground">Réservez une consultation avec votre praticien</p>
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-900">Vos prochains rendez-vous</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-blue-700">
                          {format(new Date(apt.start_time), 'd')}
                        </span>
                        <span className="text-[10px] text-blue-600">
                          {format(new Date(apt.start_time), 'MMM', { locale: fr })}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{apt.title || apt.appointment_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {apt.practitioner_name} • {format(new Date(apt.start_time), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{apt.status === 'confirmed' ? 'Confirmé' : 'En attente'}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Selection Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Choisir le praticien</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-full" />
                ) : practitioners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun praticien disponible</p>
                ) : (
                  <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un praticien" />
                    </SelectTrigger>
                    <SelectContent>
                      {practitioners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.specialty}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Motif de consultation</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedReason} onValueChange={setSelectedReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un motif" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasons.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{r.label}</span>
                            <Badge variant="secondary" className="text-xs">
                              {r.duration} min
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Selected Summary */}
            {selectedDate && selectedTime && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Praticien</Label>
                    <p className="font-medium">{selectedPractitionerData?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Motif</Label>
                    <p className="font-medium">{selectedReasonData?.label}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date et heure</Label>
                    <p className="font-medium">
                      {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })} à {selectedTime}
                    </p>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => setConfirmDialogOpen(true)}
                  >
                    Confirmer le rendez-vous
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Calendar Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">3. Choisir un créneau</CardTitle>
                  <CardDescription>
                    {selectedPractitioner && selectedReason 
                      ? 'Sélectionnez une date et un horaire disponible'
                      : 'Veuillez d\'abord sélectionner un praticien et un motif'}
                  </CardDescription>
                </div>
                {selectedPractitioner && selectedReason && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[180px] text-center">
                      {format(weekStart, 'd MMM', { locale: fr })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
                    </span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedPractitioner || !selectedReason ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Sélectionnez un praticien et un motif pour voir les disponibilités</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const daySlots = timeSlots[dateKey] || [];
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isPast = !isFuture(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      
                      return (
                        <div key={dateKey} className="space-y-2">
                          <div 
                            className={`text-center p-2 rounded-lg ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-accent'
                            }`}
                          >
                            <p className="text-xs font-medium">
                              {format(day, 'EEE', { locale: fr })}
                            </p>
                            <p className="text-lg font-bold">
                              {format(day, 'd')}
                            </p>
                          </div>
                          
                          {isWeekend || isPast ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              {isPast ? 'Passé' : 'Fermé'}
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                              {daySlots.filter(s => s.available).length === 0 ? (
                                <div className="text-center py-4 text-xs text-muted-foreground">
                                  Complet
                                </div>
                              ) : (
                                daySlots.filter(s => s.available).map((slot) => (
                                  <button
                                    key={slot.time}
                                    onClick={() => {
                                      setSelectedDate(day);
                                      setSelectedTime(slot.time);
                                    }}
                                    className={`w-full py-2 px-1 text-xs rounded-lg border transition-all ${
                                      isSelected && selectedTime === slot.time
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background hover:bg-accent border-border hover:border-primary/50'
                                    }`}
                                  >
                                    {slot.time}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer votre rendez-vous</DialogTitle>
            <DialogDescription>
              Vérifiez les informations ci-dessous avant de confirmer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 bg-accent rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{selectedPractitionerData?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedPractitionerData?.specialty}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-xs">Date</span>
                </div>
                <p className="font-medium">
                  {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Heure</span>
                </div>
                <p className="font-medium">{selectedTime}</p>
              </div>
            </div>
            
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Motif</p>
              <p className="font-medium">{selectedReasonData?.label}</p>
              <p className="text-sm text-muted-foreground">Durée: {selectedReasonData?.duration} minutes</p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>En cas d'empêchement, merci d'annuler votre rendez-vous au moins 24h à l'avance.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleBookAppointment} disabled={booking}>
              {booking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmation...
                </>
              ) : (
                'Confirmer le rendez-vous'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientLayout>
  );
}
