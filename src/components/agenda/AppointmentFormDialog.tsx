"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import {
  Appointment,
  AppointmentFormData,
  STATUS_OPTIONS,
  APPOINTMENT_TYPE_OPTIONS,
  LOCATION_OPTIONS,
} from '@/lib/appointments';
import ReasonSelect from '@/components/shared/ReasonSelect';
import { ConsultationReason } from '@/lib/consultationReasons';

const formSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  patient_id: z.string().optional(),
  practitioner_id: z.string().min(1, 'Le praticien est requis'),
  date: z.date({ required_error: 'La date est requise' }),
  start_time: z.string().min(1, 'L\'heure de début est requise'),
  end_time: z.string().min(1, 'L\'heure de fin est requise'),
  status: z.string(),
  appointment_type: z.string(),
  is_pdsa: z.boolean(),
  location: z.string().optional(),
  notes: z.string().optional(),
  reason_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultPractitionerId?: string;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
}

export default function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultTime,
  defaultPractitionerId,
  onSubmit,
}: AppointmentFormDialogProps) {
  const { structureId } = useStructureId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditing = !!appointment;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      patient_id: '',
      practitioner_id: defaultPractitionerId || '',
      date: defaultDate || new Date(),
      start_time: defaultTime || '09:00',
      end_time: defaultTime ? `${parseInt(defaultTime.split(':')[0]) + 1}:00` : '10:00',
      status: 'scheduled',
      appointment_type: 'consultation',
      is_pdsa: false,
      location: 'cabinet',
      notes: '',
      reason_id: '',
    },
  });

  useEffect(() => {
    if (appointment) {
      const startDate = new Date(appointment.start_time);
      const endDate = new Date(appointment.end_time);
      
      form.reset({
        title: appointment.title,
        description: appointment.description || '',
        patient_id: appointment.patient_id || '',
        practitioner_id: appointment.practitioner_id,
        date: startDate,
        start_time: format(startDate, 'HH:mm'),
        end_time: format(endDate, 'HH:mm'),
        status: appointment.status,
        appointment_type: appointment.appointment_type,
        is_pdsa: appointment.is_pdsa,
        location: appointment.location || '',
        notes: appointment.notes || '',
        reason_id: appointment.reason_id || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        patient_id: '',
        practitioner_id: defaultPractitionerId || '',
        date: defaultDate || new Date(),
        start_time: defaultTime || '09:00',
        end_time: defaultTime ? `${parseInt(defaultTime.split(':')[0]) + 1}:00` : '10:00',
        status: 'scheduled',
        appointment_type: 'consultation',
        is_pdsa: false,
        location: 'cabinet',
        notes: '',
        reason_id: '',
      });
    }
  }, [appointment, defaultDate, defaultTime, defaultPractitionerId, form]);

  useEffect(() => {
    if (!structureId || !open) return;

    const fetchData = async () => {
      // Fetch patients
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('structure_id', structureId)
        .eq('is_archived', false)
        .order('last_name');

      if (patientsData) {
        setPatients(patientsData);
      }

      // Fetch team members
      const { data: teamData } = await supabase
        .from('team_members')
        .select(`
          id, user_id, job_title,
          profile:profiles!team_members_user_id_fkey(first_name, last_name)
        `)
        .eq('structure_id', structureId)
        .eq('is_active', true);

      if (teamData) {
        setTeamMembers(
          teamData.map((tm) => ({
            ...tm,
            profile: Array.isArray(tm.profile) ? tm.profile[0] || null : tm.profile,
          }))
        );
      }
    };

    fetchData();
  }, [structureId, open]);

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const startDateTime = new Date(values.date);
      const [startHours, startMinutes] = values.start_time.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(values.date);
      const [endHours, endMinutes] = values.end_time.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const formData: AppointmentFormData = {
        title: values.title,
        description: values.description || null,
        patient_id: values.patient_id || null,
        practitioner_id: values.practitioner_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: values.status,
        appointment_type: values.appointment_type,
        is_pdsa: values.is_pdsa,
        location: values.location || null,
        notes: values.notes || null,
        reason_id: values.reason_id || null,
      };

      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Consultation de suivi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Aucun patient</SelectItem>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="practitioner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Praticien *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.profile?.first_name || ''} {member.profile?.last_name || ''} - {member.job_title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de début *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fin *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motif de consultation</FormLabel>
                  <FormControl>
                    <ReasonSelect
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                      showDuration
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {APPOINTMENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_pdsa"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Créneau PDSA</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Permanence des soins ambulatoires
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description du rendez-vous..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes pour l'équipe..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
