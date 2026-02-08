import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activity';

export interface Delegation {
  id: string;
  structure_id: string;
  practitioner_user_id: string;
  assistant_user_id: string;
  can_edit: boolean | null;
  created_at: string;
  practitioner?: {
    first_name: string | null;
    last_name: string | null;
  };
  assistant?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface UserWithProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export async function fetchDelegations(structureId: string): Promise<Delegation[]> {
  const { data, error } = await supabase
    .from('practitioner_assistants')
    .select(`
      id,
      structure_id,
      practitioner_user_id,
      assistant_user_id,
      can_edit,
      created_at
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Fetch profiles for practitioners and assistants
  const userIds = new Set<string>();
  data?.forEach((d) => {
    userIds.add(d.practitioner_user_id);
    userIds.add(d.assistant_user_id);
  });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', Array.from(userIds));

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

  return (data || []).map((d) => ({
    ...d,
    practitioner: profileMap.get(d.practitioner_user_id) || { first_name: null, last_name: null },
    assistant: profileMap.get(d.assistant_user_id) || { first_name: null, last_name: null },
  }));
}

export async function fetchUsersByRole(
  structureId: string,
  role: 'practitioner' | 'assistant'
): Promise<UserWithProfile[]> {
  // Get user_ids with the specified role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('structure_id', structureId)
    .eq('role', role)
    .eq('is_active', true);

  if (roleError) {
    throw roleError;
  }

  if (!roleData || roleData.length === 0) {
    return [];
  }

  const userIds = roleData.map((r) => r.user_id);

  // Get profiles for these users
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);

  if (profileError) {
    throw profileError;
  }

  return (profiles || []).map((p) => ({
    user_id: p.user_id,
    first_name: p.first_name,
    last_name: p.last_name,
    role,
  }));
}

export async function createDelegation(
  structureId: string,
  practitionerUserId: string,
  assistantUserId: string,
  canEdit: boolean,
  actorUserId: string
): Promise<Delegation> {
  const { data, error } = await supabase
    .from('practitioner_assistants')
    .insert({
      structure_id: structureId,
      practitioner_user_id: practitionerUserId,
      assistant_user_id: assistantUserId,
      can_edit: canEdit,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await logActivity({
    structureId,
    actorUserId,
    action: 'DELEGATION_CREATED',
    metadata: {
      practitioner_user_id: practitionerUserId,
      assistant_user_id: assistantUserId,
      can_edit: canEdit,
    },
  });

  return data as Delegation;
}

export async function updateDelegation(
  delegationId: string,
  canEdit: boolean,
  structureId: string,
  actorUserId: string
): Promise<Delegation> {
  const { data, error } = await supabase
    .from('practitioner_assistants')
    .update({ can_edit: canEdit })
    .eq('id', delegationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await logActivity({
    structureId,
    actorUserId,
    action: 'DELEGATION_UPDATED',
    metadata: {
      delegation_id: delegationId,
      can_edit: canEdit,
    },
  });

  return data as Delegation;
}

export async function deleteDelegation(
  delegationId: string,
  structureId: string,
  actorUserId: string
): Promise<void> {
  const { error } = await supabase
    .from('practitioner_assistants')
    .delete()
    .eq('id', delegationId);

  if (error) {
    throw error;
  }

  await logActivity({
    structureId,
    actorUserId,
    action: 'DELEGATION_DELETED',
    metadata: {
      delegation_id: delegationId,
    },
  });
}
