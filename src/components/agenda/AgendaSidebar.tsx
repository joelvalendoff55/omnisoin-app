"use client";

import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import AgendaMiniCalendar from './AgendaMiniCalendar';
import AgendaFilters from './AgendaFilters';
import { Appointment } from '@/lib/appointments';

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AgendaSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  appointments: Appointment[];
  practitioners: TeamMember[];
  selectedPractitioners: string[];
  onPractitionersChange: (ids: string[]) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
}

export default function AgendaSidebar({
  selectedDate,
  onDateChange,
  appointments,
  practitioners,
  selectedPractitioners,
  onPractitionersChange,
  selectedTypes,
  onTypesChange,
  selectedStatuses,
  onStatusesChange,
}: AgendaSidebarProps) {
  // Get unique dates with appointments for mini calendar indicators
  const appointmentDates = useMemo(() => {
    const dates: Date[] = [];
    appointments.forEach((apt) => {
      const date = new Date(apt.start_time);
      if (!dates.some((d) => isSameDay(d, date))) {
        dates.push(date);
      }
    });
    return dates;
  }, [appointments]);

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      <AgendaMiniCalendar
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        appointmentDates={appointmentDates}
      />
      
      <div className="bg-card border rounded-lg p-3">
        <h3 className="font-medium text-sm mb-3">Filtres</h3>
        <AgendaFilters
          practitioners={practitioners}
          selectedPractitioners={selectedPractitioners}
          onPractitionersChange={onPractitionersChange}
          selectedTypes={selectedTypes}
          onTypesChange={onTypesChange}
          selectedStatuses={selectedStatuses}
          onStatusesChange={onStatusesChange}
        />
      </div>

      {/* Keyboard shortcuts help */}
      <div className="bg-muted/50 border rounded-lg p-3 text-xs space-y-1">
        <div className="font-medium mb-2">Raccourcis clavier</div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vue jour</span>
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">J</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vue semaine</span>
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">S</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vue mois</span>
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">M</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Aujourd'hui</span>
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">T</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Navigation</span>
          <span className="flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">→</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
