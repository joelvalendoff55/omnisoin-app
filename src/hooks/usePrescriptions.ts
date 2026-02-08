import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStructureId } from './useStructureId';
import { useAuth } from './useAuth';
import {
  fetchPrescriptions,
  fetchPrescription,
  createPrescription,
  updatePrescription,
  signPrescription,
  deletePrescription,
  fetchPrescriptionTemplates,
  createPrescriptionTemplate,
  deletePrescriptionTemplate,
  fetchSignatureUrl,
  uploadSignature,
  CreatePrescriptionData,
  CreateTemplateData,
  Prescription,
  PrescriptionTemplate,
} from '@/lib/prescriptions';
import { toast } from 'sonner';

export function usePrescriptions() {
  const { structureId } = useStructureId();
  const queryClient = useQueryClient();

  const {
    data: prescriptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['prescriptions', structureId],
    queryFn: () => fetchPrescriptions(structureId!),
    enabled: !!structureId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePrescriptionData) => createPrescription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', structureId] });
      toast.success('Ordonnance créée');
    },
    onError: (error) => {
      console.error('Error creating prescription:', error);
      toast.error('Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreatePrescriptionData> }) =>
      updatePrescription(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', structureId] });
      toast.success('Ordonnance mise à jour');
    },
    onError: (error) => {
      console.error('Error updating prescription:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const signMutation = useMutation({
    mutationFn: (id: string) => signPrescription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', structureId] });
      toast.success('Ordonnance signée');
    },
    onError: (error) => {
      console.error('Error signing prescription:', error);
      toast.error('Erreur lors de la signature');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePrescription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', structureId] });
      toast.success('Ordonnance supprimée');
    },
    onError: (error) => {
      console.error('Error deleting prescription:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    prescriptions,
    isLoading,
    error,
    refetch,
    createPrescription: createMutation.mutate,
    updatePrescription: updateMutation.mutate,
    signPrescription: signMutation.mutate,
    deletePrescription: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isSigning: signMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function usePrescription(prescriptionId: string | undefined) {
  return useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: () => fetchPrescription(prescriptionId!),
    enabled: !!prescriptionId,
  });
}

export function usePrescriptionTemplates() {
  const { structureId } = useStructureId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['prescription-templates', structureId],
    queryFn: () => fetchPrescriptionTemplates(structureId!),
    enabled: !!structureId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateTemplateData, 'structure_id' | 'created_by'>) =>
      createPrescriptionTemplate({
        ...data,
        structure_id: structureId!,
        created_by: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates', structureId] });
      toast.success('Template sauvegardé');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePrescriptionTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates', structureId] });
      toast.success('Template supprimé');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate: createMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useSignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: signatureUrl,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['signature', user?.id],
    queryFn: () => fetchSignatureUrl(user!.id),
    enabled: !!user?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSignature(user!.id, file),
    onSuccess: (url) => {
      queryClient.setQueryData(['signature', user?.id], url);
      toast.success('Signature uploadée');
    },
    onError: (error) => {
      console.error('Error uploading signature:', error);
      toast.error("Erreur lors de l'upload de la signature");
    },
  });

  return {
    signatureUrl,
    isLoading,
    error,
    uploadSignature: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
  };
}
