"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DayAppointments {
  date: Date;
  count: number;
  load: 'light' | 'medium' | 'heavy' | 'none';
}

export function MiniCalendarWidget() {
  const router = useRouter();
  const { structureId, loading: structureLoading } = useStructureId();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [appointments, setAppointments] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate days for current week view (2 weeks shown)
  const days = useMemo(() => {
    const weekEnd = endOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  useEffect(() => {
    if (structureLoading || !structureId) return;

    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const weekEnd = endOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
        
        const { data, error } = await supabase
          .from('appointments')
          .select('id, start_time')
          .eq('structure_id', structureId)
          .neq('status', 'cancelled')
          .gte('start_time', startOfDay(currentWeekStart).toISOString())
          .lte('start_time', endOfDay(weekEnd).toISOString());

        if (error) throw error;

        // Count appointments per day
        const countMap = new Map<string, number>();
        (data || []).forEach((apt) => {
          const dateKey = format(new Date(apt.start_time), 'yyyy-MM-dd');
          countMap.set(dateKey, (countMap.get(dateKey) || 0) + 1);
        });

        setAppointments(countMap);
      } catch (error) {
        console.error('Error fetching appointments for calendar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [structureId, structureLoading, currentWeekStart]);

  const getDayData = (date: Date): DayAppointments => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const count = appointments.get(dateKey) || 0;
    
    let load: DayAppointments['load'] = 'none';
    if (count > 0 && count <= 5) load = 'light';
    else if (count > 5 && count <= 10) load = 'medium';
    else if (count > 10) load = 'heavy';

    return { date, count, load };
  };

  const getLoadColor = (load: DayAppointments['load']) => {
    switch (load) {
      case 'light': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'heavy': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getLoadLabel = (load: DayAppointments['load']) => {
    switch (load) {
      case 'light': return 'Léger';
      case 'medium': return 'Modéré';
      case 'heavy': return 'Chargé';
      default: return 'Aucun RDV';
    }
  };

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 2));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 2));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    navigate(`/agenda?date=${format(date, 'yyyy-MM-dd')}`);
  };

  if (loading && appointments.size === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendrier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Split days into weeks for display
  const week1 = days.slice(0, 7);
  const week2 = days.slice(7, 14);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendrier
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleToday}>
              Auj.
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(currentWeekStart, 'd MMM', { locale: fr })} - {format(days[days.length - 1], 'd MMM yyyy', { locale: fr })}
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Week 1 */}
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {week1.map((date) => {
              const dayData = getDayData(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <Tooltip key={date.toISOString()}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDayClick(date)}
                      className={cn(
                        'relative flex flex-col items-center justify-center p-1 h-12 rounded-md transition-colors',
                        'hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/50',
                        isToday(date) && 'ring-2 ring-primary',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-medium',
                        isToday(date) && 'text-primary'
                      )}>
                        {format(date, 'd')}
                      </span>
                      {/* Load indicator */}
                      <div className={cn(
                        'w-6 h-1.5 rounded-full mt-1',
                        getLoadColor(dayData.load)
                      )} />
                      {dayData.count > 0 && (
                        <span className="absolute top-0.5 right-0.5 text-[9px] font-bold text-muted-foreground">
                          {dayData.count}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{format(date, 'EEEE d MMMM', { locale: fr })}</p>
                    <p className="text-muted-foreground">
                      {dayData.count} RDV · {getLoadLabel(dayData.load)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Week 2 */}
          <div className="grid grid-cols-7 gap-1">
            {week2.map((date) => {
              const dayData = getDayData(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <Tooltip key={date.toISOString()}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDayClick(date)}
                      className={cn(
                        'relative flex flex-col items-center justify-center p-1 h-12 rounded-md transition-colors',
                        'hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/50',
                        isToday(date) && 'ring-2 ring-primary',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-medium',
                        isToday(date) && 'text-primary'
                      )}>
                        {format(date, 'd')}
                      </span>
                      <div className={cn(
                        'w-6 h-1.5 rounded-full mt-1',
                        getLoadColor(dayData.load)
                      )} />
                      {dayData.count > 0 && (
                        <span className="absolute top-0.5 right-0.5 text-[9px] font-bold text-muted-foreground">
                          {dayData.count}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{format(date, 'EEEE d MMMM', { locale: fr })}</p>
                    <p className="text-muted-foreground">
                      {dayData.count} RDV · {getLoadLabel(dayData.load)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">Léger</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-muted-foreground">Modéré</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground">Chargé</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
