import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ExamPrescription, PRIORITY_LABELS } from '@/lib/exams';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Calendar, CheckCircle } from 'lucide-react';

interface ExamCalendarMonthViewProps {
  selectedDate: Date;
  prescriptions: (ExamPrescription & { patient?: { id: string; first_name: string | null; last_name: string | null } })[];
  onDayClick: (date: Date) => void;
  onExamClick: (exam: ExamPrescription) => void;
}

const STATUS_COLORS = {
  prescribed: 'bg-amber-500',
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

export function ExamCalendarMonthView({
  selectedDate,
  prescriptions,
  onDayClick,
  onExamClick,
}: ExamCalendarMonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedDate]);

  const getExamsForDay = (date: Date) => {
    return prescriptions.filter((exam) => {
      // Check scheduled_date first
      if (exam.scheduled_date) {
        return isSameDay(new Date(exam.scheduled_date), date);
      }
      // For unscheduled exams, don't show them in calendar
      return false;
    });
  };

  const getUnscheduledExams = () => {
    return prescriptions.filter((exam) => !exam.scheduled_date && exam.status === 'prescribed');
  };

  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const unscheduledExams = getUnscheduledExams();

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)]">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-7 auto-rows-fr min-h-full">
            {days.map((day) => {
              const dayExams = getExamsForDay(day);
              const isCurrentMonth = isSameMonth(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r border-b min-h-[120px] p-1 cursor-pointer hover:bg-accent/30 transition-colors',
                    !isCurrentMonth && 'bg-muted/30',
                    isToday(day) && 'bg-primary/5'
                  )}
                  onClick={() => onDayClick(day)}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium px-1.5 py-0.5 rounded-full',
                        !isCurrentMonth && 'text-muted-foreground',
                        isToday(day) && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayExams.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{dayExams.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Exams (max 3 visible) */}
                  <div className="space-y-0.5">
                    {dayExams.slice(0, 3).map((exam) => (
                      <div
                        key={exam.id}
                        className={cn(
                          'text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80',
                          STATUS_COLORS[exam.status]
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExamClick(exam);
                        }}
                      >
                        <span className="font-medium">{exam.exam?.name}</span>
                        {exam.patient && (
                          <span className="ml-1 opacity-80">
                            - {exam.patient.first_name} {exam.patient.last_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Unscheduled exams sidebar */}
      {unscheduledExams.length > 0 && (
        <div className="w-72 border-l">
          <div className="p-3 border-b bg-muted/50">
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
