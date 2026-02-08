"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import { useToast } from '@/hooks/use-toast';
import {
  TeamMember,
  TeamMemberFormData,
  fetchTeamMembers,
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
} from '@/lib/team';

interface UseTeamMembersResult {
  teamMembers: TeamMember[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (formData: TeamMemberFormData) => Promise<TeamMember | null>;
  update: (id: string, formData: Partial<TeamMemberFormData>) => Promise<TeamMember | null>;
  deactivate: (id: string) => Promise<boolean>;
}

export function useTeamMembers(): UseTeamMembersResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!structureId) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchTeamMembers(structureId);
      setTeamMembers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading) {
      refetch();
    }
  }, [structureLoading, refetch]);

  const create = useCallback(
    async (formData: TeamMemberFormData): Promise<TeamMember | null> => {
      if (!structureId) {
        toast({
          title: 'Erreur',
          description: 'Structure non trouvée',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const member = await createTeamMember(structureId, formData);
        toast({
          title: 'Membre ajouté',
          description: 'Le membre a été ajouté à l\'équipe',
        });
        await refetch();
        return member;
      } catch (err) {
        console.error('Error creating team member:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'ajouter le membre',
          variant: 'destructive',
        });
        return null;
      }
    },
    [structureId, toast, refetch]
  );

  const update = useCallback(
    async (id: string, formData: Partial<TeamMemberFormData>): Promise<TeamMember | null> => {
      try {
        const member = await updateTeamMember(id, formData);
        toast({
          title: 'Membre modifié',
          description: 'Les informations ont été mises à jour',
        });
        await refetch();
        return member;
      } catch (err) {
        console.error('Error updating team member:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de modifier le membre',
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast, refetch]
  );

  const deactivate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deactivateTeamMember(id);
        toast({
          title: 'Membre désactivé',
          description: 'Le membre a été retiré de l\'équipe',
        });
        await refetch();
        return true;
      } catch (err) {
        console.error('Error deactivating team member:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de désactiver le membre',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast, refetch]
  );

  return {
    teamMembers,
    loading: loading || structureLoading,
    error,
    refetch,
    create,
    update,
    deactivate,
  };
}
