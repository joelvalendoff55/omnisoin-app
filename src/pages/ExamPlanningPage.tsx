"use client";

import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useExamPrescriptionsCalendar, CalendarViewMode } from '@/hooks/useExamPrescriptionsCalendar';
import { ExamCalendarMonthView } from '@/components/exams/ExamCalendarMonthView';
import { ExamCalendarWeekView } from '@/components/exams/ExamCalendarWeekView';
import { ExamDetailDialog } from '@/components/exams/ExamDetailDialog';
import { ExamPrescription } from '@/lib/exams';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  TestTube,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

type StatusFilterType = ExamPrescription['status'] | 'all';

export default function ExamPlanningPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [selectedExam, setSelectedExam] = useState<(ExamPrescription & { patient?: { id: string; first_name: string | null; last_name: string | null } }) | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const statusFilterArray = statusFilter === 'all' ? [] : [statusFilter];

  const {
    prescriptions,
    allPrescriptions,
    isLoading,
    scheduleExam,
    completeExam,
    cancelExam,
    isUpdating,
  } = useExamPrescriptionsCalendar({
    viewMode,
    selectedDate,
    statusFilter: statusFilterArray,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 's':
          setViewMode('week');
          break;
        case 'm':
          setViewMode('month');
          break;
        case 'arrowleft':
          navigatePrev();
          break;
        case 'arrowright':
          navigateNext();
          break;
        case 't':
          setSelectedDate(new Date());
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const navigatePrev = useCallback(() => {
    if (viewMode === 'month') {
      setSelectedDate((d) => subMonths(d, 1));
    } else {
      setSelectedDate((d) => subWeeks(d, 1));
    }
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    if (viewMode === 'month') {
      setSelectedDate((d) => addMonths(d, 1));
    } else {
      setSelectedDate((d) => addWeeks(d, 1));
    }
  }, [viewMode]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('week');
  };

  const handleExamClick = (exam: ExamPrescription & { patient?: { id: string; first_name: string | null; last_name: string | null } }) => {
    setSelectedExam(exam);
    setDetailDialogOpen(true);
  };

  const handleSchedule = (prescriptionId: string, date: string) => {
    scheduleExam(prescriptionId, date);
    setDetailDialogOpen(false);
  };

  const handleComplete = (prescriptionId: string, results?: string) => {
    completeExam(prescriptionId, results);
    setDetailDialogOpen(false);
  };

  const handleCancel = (prescriptionId: string) => {
    cancelExam(prescriptionId);
    setDetailDialogOpen(false);
  };

  // Stats
  const stats = {
    prescribed: allPrescriptions.filter((p) => p.status === 'prescribed').length,
    scheduled: allPrescriptions.filter((p) => p.status === 'scheduled').length,
    completed: allPrescriptions.filter((p) => p.status === 'completed').length,
    cancelled: allPrescriptions.filter((p) => p.status === 'cancelled').length,
  };

  const getDateLabel = () => {
    if (viewMode === 'month') {
      return format(selectedDate, 'MMMM yyyy', { locale: fr });
    } else {
      return `Semaine du ${format(selectedDate, 'dd MMMM yyyy', { locale: fr })}`;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TestTube className="h-6 w-6" />
              Planning des examens
            </h1>
            <p className="text-muted-foreground">
              Planifiez et suivez les examens complémentaires prescrits
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="prescribed">Prescrits</SelectItem>
                <SelectItem value="scheduled">Planifiés</SelectItem>
                <SelectItem value="completed">Réalisés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
              </SelectContent>
            </Select>

            {/* View mode toggle */}
            <div className="flex border rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="gap-1"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Semaine</span>
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Mois</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('prescribed')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.prescribed}</p>
                <p className="text-xs text-muted-foreground">À planifier</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('scheduled')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-xs text-muted-foreground">Planifiés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('completed')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Réalisés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('cancelled')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <XCircle className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Annulés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
              Aujourd'hui
            </Button>
          </div>
          <h2 className="text-lg font-semibold capitalize">{getDateLabel()}</h2>
          <div className="text-sm text-muted-foreground">
            {prescriptions.length} examen(s) affichés
          </div>
        </div>

        {/* Calendar */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[500px] w-full" />
          </div>
        ) : viewMode === 'month' ? (
          <ExamCalendarMonthView
            selectedDate={selectedDate}
            prescriptions={prescriptions}
            onDayClick={handleDayClick}
            onExamClick={handleExamClick}
          />
        ) : (
          <ExamCalendarWeekView
            selectedDate={selectedDate}
            prescriptions={prescriptions}
            onDayClick={handleDayClick}
            onExamClick={handleExamClick}
          />
        )}

        {/* Keyboard shortcuts hint */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">S</kbd> Semaine
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">M</kbd> Mois
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">T</kbd> Aujourd'hui
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">→</kbd> Navigation
          </span>
        </div>
      </div>

      {/* Detail Dialog */}
      <ExamDetailDialog
        exam={selectedExam}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSchedule={handleSchedule}
        onComplete={handleComplete}
        onCancel={handleCancel}
        isUpdating={isUpdating}
      />
    </DashboardLayout>
  );
}
