"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { ExamPrescription, updateExamPrescriptionStatus } from '@/lib/exams';
import { toast } from 'sonner';

export type CalendarViewMode = 'week' | 'month';

interface UseExamPrescriptionsCalendarOptions {
  viewMode?: CalendarViewMode;
  selectedDate?: Date;
  statusFilter?: ExamPrescription['status'][];
}

export function useExamPrescriptionsCalendar(options: UseExamPrescriptionsCalendarOptions = {}) {
  const { viewMode = 'month', selectedDate = new Date(), statusFilter = [] } = options;
  const { structureId } = useStructureId();
  const queryClient = useQueryClient();

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 1 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
      };
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return { start: weekStart, end: weekEnd };
    }
  }, [viewMode, selectedDate]);

  const { data: prescriptions = [], isLoading, refetch } = useQuery({
    queryKey: ['exam-prescriptions-calendar', structureId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!structureId) return [];

      let query = supabase
        .from('exam_prescriptions')
        .select(`
          *,
          exam:complementary_exams(*),
          patient:patients(id, first_name, last_name)
        `)
        .eq('structure_id', structureId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching exam prescriptions:', error);
        throw error;
      }

      return (data || []) as (ExamPrescription & { patient?: { id: string; first_name: string | null; last_name: string | null } })[];
    },
    enabled: !!structureId,
  });

  // Filter by status
  const filteredPrescriptions = useMemo(() => {
    if (statusFilter.length === 0) return prescriptions;
    return prescriptions.filter((p) => statusFilter.includes(p.status));
  }, [prescriptions, statusFilter]);

  // Real-time subscription
  useEffect(() => {
    if (!structureId) return;

    const channel = supabase
      .channel('exam_prescriptions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_prescriptions',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: ({
      prescriptionId,
      status,
      additionalData,
    }: {
      prescriptionId: string;
      status: ExamPrescription['status'];
      additionalData?: { scheduled_date?: string; completed_date?: string; results?: string };
    }) => updateExamPrescriptionStatus(prescriptionId, status, additionalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-prescriptions-calendar'] });
      toast.success('Prescription mise à jour');
    },
    onError: (err) => {
      console.error('Error updating prescription:', err);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const scheduleExam = useCallback((prescriptionId: string, scheduledDate: string) => {
    updateStatusMutation.mutate({
      prescriptionId,
      status: 'scheduled',
      additionalData: { scheduled_date: scheduledDate },
    });
  }, [updateStatusMutation]);

  const completeExam = useCallback((prescriptionId: string, results?: string) => {
    updateStatusMutation.mutate({
      prescriptionId,
      status: 'completed',
      additionalData: {
        completed_date: new Date().toISOString(),
        results,
      },
    });
  }, [updateStatusMutation]);

  const cancelExam = useCallback((prescriptionId: string) => {
    updateStatusMutation.mutate({
      prescriptionId,
      status: 'cancelled',
    });
  }, [updateStatusMutation]);

  return {
    prescriptions: filteredPrescriptions,
    allPrescriptions: prescriptions,
    isLoading,
    refetch,
    scheduleExam,
    completeExam,
    cancelExam,
    isUpdating: updateStatusMutation.isPending,
    dateRange,
  };
}
