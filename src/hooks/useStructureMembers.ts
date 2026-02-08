"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import {
  StructureMember,
  OrgRole,
  fetchStructureMembers,
  updateMemberRole,
  approveMember,
  rejectMember,
  removeMember,
  inviteMemberByUserId,
  groupMembersByRole,
} from '@/lib/structureMembers';
import { toast } from 'sonner';

export interface UseStructureMembersResult {
  members: StructureMember[];
  activeMembers: StructureMember[];
  pendingMembers: StructureMember[];
  groupedByRole: Map<OrgRole, StructureMember[]>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateRole: (memberId: string, newRole: OrgRole) => Promise<boolean>;
  approve: (memberId: string) => Promise<boolean>;
  reject: (memberId: string) => Promise<boolean>;
  remove: (memberId: string) => Promise<boolean>;
  invite: (userId: string, role: OrgRole) => Promise<boolean>;
}

export function useStructureMembers(): UseStructureMembersResult {
  const { structureId, loading: structureLoading } = useStructureId();
  const [members, setMembers] = useState<StructureMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!structureId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchStructureMembers(structureId);
      setMembers(data);
    } catch (err) {
      console.error('Error fetching structure members:', err);
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

  const activeMembers = members.filter(m => m.is_active);
  const pendingMembers = members.filter(m => !m.is_active);
  const groupedByRole = groupMembersByRole(activeMembers);

  const updateRole = async (memberId: string, newRole: OrgRole): Promise<boolean> => {
    try {
      await updateMemberRole(memberId, newRole);
      toast.success('Rôle mis à jour');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Erreur lors de la mise à jour du rôle');
      return false;
    }
  };

  const approve = async (memberId: string): Promise<boolean> => {
    try {
      await approveMember(memberId);
      toast.success('Membre approuvé');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error approving member:', err);
      toast.error('Erreur lors de l\'approbation');
      return false;
    }
  };

  const reject = async (memberId: string): Promise<boolean> => {
    try {
      await rejectMember(memberId);
      toast.success('Demande rejetée');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error rejecting member:', err);
      toast.error('Erreur lors du rejet');
      return false;
    }
  };

  const remove = async (memberId: string): Promise<boolean> => {
    try {
      await removeMember(memberId);
      toast.success('Membre retiré');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  const invite = async (userId: string, role: OrgRole): Promise<boolean> => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return false;
    }

    try {
      const result = await inviteMemberByUserId(structureId, userId, role);
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'invitation');
        return false;
      }
      toast.success('Membre ajouté avec succès');
      await refetch();
      return true;
    } catch (err) {
      console.error('Error inviting member:', err);
      toast.error('Erreur lors de l\'invitation');
      return false;
    }
  };

  return {
    members,
    activeMembers,
    pendingMembers,
    groupedByRole,
    loading: loading || structureLoading,
    error,
    refetch,
    updateRole,
    approve,
    reject,
    remove,
    invite,
  };
}
