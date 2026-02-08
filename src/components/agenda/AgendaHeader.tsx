"use client";

import { format, addDays, addWeeks, subDays, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AgendaHeaderProps {
  viewMode: 'day' | 'week';
  onViewModeChange: (mode: 'day' | 'week') => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedPractitioner: string;
  onPractitionerChange: (id: string) => void;
  practitioners: TeamMember[];
  onNewAppointment: () => void;
}

export default function AgendaHeader({
  viewMode,
  onViewModeChange,
  selectedDate,
  onDateChange,
  selectedPractitioner,
  onPractitionerChange,
  practitioners,
  onNewAppointment,
}: AgendaHeaderProps) {
  const handlePrevious = () => {
    if (viewMode === 'day') {
      onDateChange(subDays(selectedDate, 1));
    } else {
      onDateChange(subWeeks(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(selectedDate, 1));
    } else {
      onDateChange(addWeeks(selectedDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getDateLabel = () => {
    if (viewMode === 'day') {
      return format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
    }
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Button
          data-testid="agenda-new-button"
          onClick={onNewAppointment}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau RDV
        </Button>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as 'day' | 'week')}
        >
          <ToggleGroupItem value="day" data-testid="agenda-day-view">
            Jour
          </ToggleGroupItem>
          <ToggleGroupItem value="week" data-testid="agenda-week-view">
            Semaine
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2" data-testid="agenda-date-nav">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleToday}>
          Aujourd'hui
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md min-w-[200px] justify-center">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium capitalize">{getDateLabel()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedPractitioner} onValueChange={onPractitionerChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les praticiens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les praticiens</SelectItem>
            {practitioners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.profile?.first_name || ''} {p.profile?.last_name || ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
