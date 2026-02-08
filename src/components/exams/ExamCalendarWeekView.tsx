"use client";

import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ExamPrescription } from '@/lib/exams';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';

interface ExamCalendarWeekViewProps {
  selectedDate: Date;
  prescriptions: (ExamPrescription & { patient?: { id: string; first_name: string | null; last_name: string | null } })[];
  onDayClick: (date: Date) => void;
  onExamClick: (exam: ExamPrescription) => void;
}

const STATUS_COLORS = {
  prescribed: 'bg-amber-100 border-amber-300 text-amber-900',
  scheduled: 'bg-blue-100 border-blue-300 text-blue-900',
  completed: 'bg-green-100 border-green-300 text-green-900',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-600',
};

export function ExamCalendarWeekView({
  selectedDate,
  prescriptions,
  onDayClick,
  onExamClick,
}: ExamCalendarWeekViewProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const getExamsForDay = (date: Date) => {
    return prescriptions.filter((exam) => {
      if (exam.scheduled_date) {
        return isSameDay(new Date(exam.scheduled_date), date);
      }
      return false;
    });
  };

  const getUnscheduledExams = () => {
    return prescriptions.filter((exam) => !exam.scheduled_date && exam.status === 'prescribed');
  };

  const unscheduledExams = getUnscheduledExams();

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)]">
      {/* Week Grid */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'p-3 text-center border-r last:border-r-0',
                isToday(day) && 'bg-primary/10'
              )}
            >
              <div className="text-sm font-medium capitalize">
                {format(day, 'EEEE', { locale: fr })}
              </div>
              <div
                className={cn(
                  'text-2xl font-semibold',
                  isToday(day) && 'text-primary'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(day, 'MMMM', { locale: fr })}
              </div>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-7 h-full min-h-[400px]">
            {weekDays.map((day) => {
              const dayExams = getExamsForDay(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r last:border-r-0 p-2 cursor-pointer hover:bg-accent/30 transition-colors',
                    isToday(day) && 'bg-primary/5'
                  )}
                  onClick={() => onDayClick(day)}
                >
                  <div className="space-y-2">
                    {dayExams.map((exam) => (
                      <div
                        key={exam.id}
                        className={cn(
                          'p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
                          STATUS_COLORS[exam.status]
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExamClick(exam);
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-medium text-xs truncate">{exam.exam?.name}</span>
                          {exam.priority === 'urgent' && (
                            <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                          )}
                        </div>
                        {exam.patient && (
                          <p className="text-[10px] opacity-80 mt-0.5 truncate">
                            {exam.patient.first_name} {exam.patient.last_name}
                          </p>
                        )}
                        {exam.exam?.category && (
                          <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">
                            {exam.exam.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {dayExams.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-4">
                        Aucun examen
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Unscheduled exams sidebar */}
      {unscheduledExams.length > 0 && (
        <div className="w-72 border rounded-lg">
          <div className="p-3 border-b bg-muted/50 rounded-t-lg">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              À planifier ({unscheduledExams.length})
            </h3>
          </div>
          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="p-2 space-y-2">
              {unscheduledExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-2 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onExamClick(exam)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{exam.exam?.name}</span>
                    {exam.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-[10px] px-1">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                  {exam.patient && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {exam.patient.first_name} {exam.patient.last_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {exam.indication}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Prescrit le {format(new Date(exam.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
