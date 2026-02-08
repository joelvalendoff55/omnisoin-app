import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  SystemPrompt,
  PromptVersion,
  getPrompts,
  getVersions,
  createVersion,
  publishVersion,
  rollbackVersion,
} from '@/lib/prompts';
import { toast } from 'sonner';

export function usePromptAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Fetch all prompts
  const {
    data: prompts = [],
    isLoading: promptsLoading,
    error: promptsError,
  } = useQuery({
    queryKey: ['system-prompts'],
    queryFn: getPrompts,
  });

  // Fetch versions for selected prompt
  const {
    data: versions = [],
    isLoading: versionsLoading,
  } = useQuery({
    queryKey: ['prompt-versions', selectedPromptId],
    queryFn: () => (selectedPromptId ? getVersions(selectedPromptId) : Promise.resolve([])),
    enabled: !!selectedPromptId,
  });

  // Get selected prompt
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) || null;

  // Get selected version
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || null;

  // Get published version
  const publishedVersion = versions.find((v) => v.is_published) || null;

  // Select a prompt
  const selectPrompt = useCallback((prompt: SystemPrompt | null) => {
    setSelectedPromptId(prompt?.id || null);
    setSelectedVersionId(null);
  }, []);

  // Select a version
  const selectVersion = useCallback((version: PromptVersion | null) => {
    setSelectedVersionId(version?.id || null);
  }, []);

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async ({ content, notes }: { content: string; notes: string | null }) => {
      if (!selectedPromptId || !user) throw new Error('Missing required data');
      return createVersion(selectedPromptId, content, notes, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-versions', selectedPromptId] });
      toast.success('Version créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating version:', error);
      toast.error('Erreur lors de la création de la version');
    },
  });

  // Publish version mutation
  const publishVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('User not authenticated');
      return publishVersion(versionId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-versions', selectedPromptId] });
      toast.success('Version publiée avec succès');
    },
    onError: (error) => {
      console.error('Error publishing version:', error);
      toast.error('Erreur lors de la publication de la version');
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('User not authenticated');
      return rollbackVersion(versionId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-versions', selectedPromptId] });
      toast.success('Rollback effectué avec succès');
    },
    onError: (error) => {
      console.error('Error rolling back version:', error);
      toast.error('Erreur lors du rollback');
    },
  });

  return {
    // State
    prompts,
    versions,
    selectedPrompt,
    selectedVersion,
    publishedVersion,
    promptsLoading,
    versionsLoading,
    promptsError,

    // Actions
    selectPrompt,
    selectVersion,
    createVersion: createVersionMutation.mutateAsync,
    publishVersion: publishVersionMutation.mutateAsync,
    rollback: rollbackMutation.mutateAsync,

    // Mutation states
    isCreating: createVersionMutation.isPending,
    isPublishing: publishVersionMutation.isPending,
    isRollingBack: rollbackMutation.isPending,
  };
}
