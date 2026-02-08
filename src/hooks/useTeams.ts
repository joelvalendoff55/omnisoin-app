"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import {
  Team,
  TeamMembership,
  TeamFormData,
  fetchTeams,
  createTeam,
  createDefaultTeams,
  updateTeam,
  deleteTeam,
  toggleTeamActive,
  fetchTeamMembers,
  addTeamMember,
  removeTeamMember,
} from '@/lib/teams';
import { toast } from 'sonner';

export interface UseTeamsResult {
  teams: Team[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (formData: TeamFormData) => Promise<Team | null>;
  createDefaults: () => Promise<Team[] | null>;
  update: (id: string, formData: Partial<TeamFormData>) => Promise<Team | null>;
  remove: (id: string) => Promise<boolean>;
  toggleActive: (id: string, isActive: boolean) => Promise<Team | null>;
}

export function useTeams(): UseTeamsResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!structureId) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeams(structureId);
      setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading) {
      refetch();
    }
  }, [structureLoading, refetch]);

  const create = async (formData: TeamFormData): Promise<Team | null> => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return null;
    }

    try {
      const team = await createTeam(structureId, formData);
      toast.success(`Équipe "${team.name}" créée`);
      await refetch();
      return team;
    } catch (err: unknown) {
      console.error('Error creating team:', err);
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        toast.error('Une équipe avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la création de l\'équipe');
      }
      return null;
    }
  };

  const createDefaults = async (): Promise<Team[] | null> => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return null;
    }

    try {
      const createdTeams = await createDefaultTeams(structureId);
      await refetch();
      return createdTeams;
    } catch (err) {
      console.error('Error creating default teams:', err);
      toast.error('Erreur lors de la création des équipes par défaut');
      return null;
    }
  };

  const update = async (id: string, formData: Partial<TeamFormData>): Promise<Team | null> => {
    try {
      const team = await updateTeam(id, formData);
      await refetch();
      return team;
    } catch (err: unknown) {
      console.error('Error updating team:', err);
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        toast.error('Une équipe avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
      return null;
    }
  };

  const toggleActive = async (id: string, isActive: boolean): Promise<Team | null> => {
    try {
      const team = await toggleTeamActive(id, isActive);
      await refetch();
      return team;
    } catch (err) {
      console.error('Error toggling team active:', err);
      toast.error('Erreur lors de la modification de l\'équipe');
      return null;
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    try {
      await deleteTeam(id);
      toast.success('Équipe supprimée');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error deleting team:', err);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  return {
    teams,
    loading: loading || structureLoading,
    error,
    refetch,
    create,
    createDefaults,
    update,
    remove,
    toggleActive,
  };
}

export interface UseTeamMembersResult {
  members: TeamMembership[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  add: (userId: string, roleInTeam?: string) => Promise<boolean>;
  remove: (membershipId: string) => Promise<boolean>;
}

export function useTeamMembers(teamId: string | null): UseTeamMembersResult {
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeamMembers(teamId);
      setMembers(data);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const add = async (userId: string, roleInTeam?: string): Promise<boolean> => {
    if (!teamId) return false;

    try {
      await addTeamMember(teamId, userId, roleInTeam);
      toast.success('Membre ajouté à l\'équipe');
      await refetch();
      return true;
    } catch (err: any) {
      console.error('Error adding team member:', err);
      if (err.code === '23505') {
        toast.error('Ce membre fait déjà partie de l\'équipe');
      } else {
        toast.error('Erreur lors de l\'ajout du membre');
      }
      return false;
    }
  };

  const remove = async (membershipId: string): Promise<boolean> => {
    try {
      await removeTeamMember(membershipId);
      toast.success('Membre retiré de l\'équipe');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error removing team member:', err);
      toast.error('Erreur lors du retrait du membre');
      return false;
    }
  };

  return {
    members,
    loading,
    error,
    refetch,
    add,
    remove,
  };
}
