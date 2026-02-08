"use client";

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EnhancedAgendaHeader, { ViewMode } from '@/components/agenda/EnhancedAgendaHeader';
import EnhancedAgendaCalendar from '@/components/agenda/EnhancedAgendaCalendar';
import AgendaMonthView from '@/components/agenda/AgendaMonthView';
import AgendaSidebar from '@/components/agenda/AgendaSidebar';
import AppointmentFormDialog from '@/components/agenda/AppointmentFormDialog';
import { useAppointments } from '@/hooks/useAppointments';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Appointment, AppointmentFormData } from '@/lib/appointments';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function AgendaPage() {
  const { structureId } = useStructureId();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [practitioners, setPractitioners] = useState<TeamMember[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [defaultFormDate, setDefaultFormDate] = useState<Date | undefined>();
  const [defaultFormTime, setDefaultFormTime] = useState<string | undefined>();
  const [defaultFormPractitioner, setDefaultFormPractitioner] = useState<string | undefined>();

  // Filters
  const [selectedPractitioners, setSelectedPractitioners] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Arrived patients (from queue)
  const [arrivedPatientIds, setArrivedPatientIds] = useState<string[]>([]);

  const {
    appointments,
    loading,
    create,
    update,
    cancel,
    complete,
    remove,
    moveAppointment,
  } = useAppointments({
    viewMode,
    selectedDate,
    practitionerIds: selectedPractitioners,
    appointmentTypes: selectedTypes,
    statuses: selectedStatuses,
  });

  // Fetch practitioners
  useEffect(() => {
    if (!structureId) return;

    const fetchPractitioners = async () => {
      const { data } = await supabase
        .from('team_members')
        .select(`
          id, user_id, job_title,
          profile:profiles!team_members_user_id_fkey(first_name, last_name)
        `)
        .eq('structure_id', structureId)
        .eq('is_active', true);

      if (data) {
        setPractitioners(
          data.map((tm) => ({
            ...tm,
            profile: Array.isArray(tm.profile) ? tm.profile[0] || null : tm.profile,
          }))
        );
      }
    };

    fetchPractitioners();
  }, [structureId]);

  // Fetch arrived patients from queue
  useEffect(() => {
    if (!structureId) return;

    const fetchArrivedPatients = async () => {
      const { data } = await supabase
        .from('patient_queue')
        .select('patient_id')
        .eq('structure_id', structureId)
        .in('status', ['arrived', 'in_progress']);

      if (data) {
        setArrivedPatientIds(data.map((q) => q.patient_id).filter(Boolean) as string[]);
      }
    };

    fetchArrivedPatients();

    // Subscribe to queue changes
    const channel = supabase
      .channel('queue_arrived_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchArrivedPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId]);

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setDefaultFormDate(undefined);
    setDefaultFormTime(undefined);
    setDefaultFormPractitioner(undefined);
    setFormOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number, practitionerId?: string) => {
    // Single click: select this slot (could be used for selection later)
  };

  const handleSlotDoubleClick = (date: Date, hour: number, practitionerId?: string) => {
    // Double click: create appointment
    setEditingAppointment(null);
    setDefaultFormDate(date);
    setDefaultFormTime(`${hour.toString().padStart(2, '0')}:00`);
    setDefaultFormPractitioner(practitionerId);
    setFormOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const handleFormSubmit = async (formData: AppointmentFormData) => {
    if (editingAppointment) {
      await update(editingAppointment.id, formData);
    } else {
      await create(formData);
    }
  };

  const handleAppointmentMove = async (id: string, newStart: Date, newEnd: Date) => {
    await moveAppointment(id, newStart, newEnd);
  };

  return (
    <TooltipProvider>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Gestion des rendez-vous et créneaux
            </p>
          </div>

          <EnhancedAgendaHeader
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onNewAppointment={handleNewAppointment}
          />

          <div className="flex gap-6">
            {/* Sidebar with mini calendar and filters */}
            <AgendaSidebar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              appointments={appointments}
              practitioners={practitioners}
              selectedPractitioners={selectedPractitioners}
              onPractitionersChange={setSelectedPractitioners}
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
              selectedStatuses={selectedStatuses}
              onStatusesChange={setSelectedStatuses}
            />

            {/* Main calendar area */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-[500px] w-full" />
                </div>
              ) : viewMode === 'month' ? (
                <AgendaMonthView
                  selectedDate={selectedDate}
                  appointments={appointments}
                  onDayClick={handleDayClick}
                  onAppointmentClick={handleAppointmentClick}
                />
              ) : (
                <EnhancedAgendaCalendar
                  viewMode={viewMode}
                  selectedDate={selectedDate}
                  appointments={appointments}
                  practitioners={practitioners}
                  selectedPractitioners={selectedPractitioners}
                  arrivedPatientIds={arrivedPatientIds}
                  onSlotClick={handleSlotClick}
                  onSlotDoubleClick={handleSlotDoubleClick}
                  onAppointmentClick={handleAppointmentClick}
                  onAppointmentMove={handleAppointmentMove}
                />
              )}
            </div>
          </div>

          <AppointmentFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            appointment={editingAppointment}
            defaultDate={defaultFormDate}
            defaultTime={defaultFormTime}
            defaultPractitionerId={defaultFormPractitioner}
            onSubmit={handleFormSubmit}
          />
        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
