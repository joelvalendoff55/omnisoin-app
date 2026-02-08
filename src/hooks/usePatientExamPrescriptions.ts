import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchExamPrescriptions, updateExamPrescriptionStatus, ExamPrescription } from '@/lib/exams';
import { toast } from 'sonner';

export function usePatientExamPrescriptions(patientId: string) {
  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['exam-prescriptions', patientId],
    queryFn: () => fetchExamPrescriptions(patientId),
    enabled: !!patientId,
  });

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
      queryClient.invalidateQueries({ queryKey: ['exam-prescriptions', patientId] });
      toast.success('Statut mis à jour');
    },
    onError: (err) => {
      console.error('Error updating status:', err);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const markAsScheduled = (prescriptionId: string, scheduledDate: string) => {
    updateStatusMutation.mutate({
      prescriptionId,
      status: 'scheduled',
      additionalData: { scheduled_date: scheduledDate },
    });
  };

  const markAsCompleted = (prescriptionId: string, results?: string) => {
    updateStatusMutation.mutate({
      prescriptionId,
      status: 'completed',
      additionalData: { 
        completed_date: new Date().toISOString(),
        results,
      },
    });
  };

  const markAsCancelled = (prescriptionId: string) => {
    updateStatusMutation.mutate({
      prescriptionId,
      status: 'cancelled',
    });
  };

  return {
    prescriptions,
    isLoading,
    error,
    refetch,
    markAsScheduled,
    markAsCompleted,
    markAsCancelled,
    isUpdating: updateStatusMutation.isPending,
  };
}
