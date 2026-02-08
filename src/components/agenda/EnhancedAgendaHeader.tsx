"use client";

import { useEffect } from 'react';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ViewMode = 'day' | 'week' | 'month';

interface EnhancedAgendaHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onNewAppointment: () => void;
}

export default function EnhancedAgendaHeader({
  viewMode,
  onViewModeChange,
  selectedDate,
  onDateChange,
  onNewAppointment,
}: EnhancedAgendaHeaderProps) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'j':
          onViewModeChange('day');
          break;
        case 's':
          onViewModeChange('week');
          break;
        case 'm':
          onViewModeChange('month');
          break;
        case 'arrowleft':
          handlePrevious();
          break;
        case 'arrowright':
          handleNext();
          break;
        case 't':
          handleToday();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, selectedDate, onViewModeChange]);

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(subDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getDateLabel = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: fr });
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
          onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="day" data-testid="agenda-day-view">
                Jour
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Touche J</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="week" data-testid="agenda-week-view">
                Semaine
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Touche S</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="month" data-testid="agenda-month-view">
                Mois
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Touche M</TooltipContent>
          </Tooltip>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2" data-testid="agenda-date-nav">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={handleToday}>
              Aujourd'hui
            </Button>
          </TooltipTrigger>
          <TooltipContent>Touche T</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md min-w-[200px] justify-center">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium capitalize">{getDateLabel()}</span>
        </div>
      </div>
    </div>
  );
}
