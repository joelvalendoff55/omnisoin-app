import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type OrgRole = 'owner' | 'admin' | 'coordinator' | 'doctor' | 'ipa' | 'nurse' | 'assistant' | 'viewer';

export interface StructureMember {
  id: string;
  user_id: string;
  structure_id: string;
  org_role: OrgRole;
  is_active: boolean;
  accepted_at: string | null;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  coordinator: 'Coordinatrice',
  doctor: 'Médecin',
  ipa: 'IPA',
  nurse: 'Infirmier(e)',
  assistant: 'Assistante',
  viewer: 'Lecteur',
};

export const ROLE_COLORS: Record<OrgRole, string> = {
  owner: '#6366f1',
  admin: '#3b82f6',
  coordinator: '#10b981',
  doctor: '#8b5cf6',
  ipa: '#f59e0b',
  nurse: '#ec4899',
  assistant: '#06b6d4',
  viewer: '#6b7280',
};

// Display order for grouping
export const ROLE_ORDER: OrgRole[] = [
  'owner',
  'admin',
  'doctor',
  'ipa',
  'nurse',
  'coordinator',
  'assistant',
  'viewer',
];

export async function fetchStructureMembers(structureId: string): Promise<StructureMember[]> {
  console.log('🔍 [fetchStructureMembers] Starting fetch for structure:', structureId);
  
  const { data: members, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('structure_id', structureId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [fetchStructureMembers] Error fetching members:', error);
    throw error;
  }
  
  console.log('✅ [fetchStructureMembers] Members fetched:', members?.length || 0, 'members');
  
  if (!members || members.length === 0) return [];

  // Fetch profiles for users
  const userIds = members.map(m => m.user_id);
  console.log('👥 [fetchStructureMembers] Fetching profiles for', userIds.length, 'users');
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);
  
  console.log('✅ [fetchStructureMembers] Profiles fetched:', profiles?.length || 0, 'profiles');

  const profileMap = new Map<string, StructureMember['profile']>();
  (profiles || []).forEach(p => {
    profileMap.set(p.user_id, {
      first_name: p.first_name,
      last_name: p.last_name,
    });
  });

  const result = members.map(m => ({
    id: m.id,
    user_id: m.user_id,
    structure_id: m.structure_id,
    org_role: m.org_role as OrgRole,
    is_active: m.is_active,
    accepted_at: m.accepted_at,
    created_at: m.created_at,
    profile: profileMap.get(m.user_id),
  }));
  
  console.log('📋 [fetchStructureMembers] Final result:', result);
  return result;
}

export async function updateMemberRole(memberId: string, newRole: OrgRole): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .update({ org_role: newRole })
    .eq('id', memberId);

  if (error) throw error;
}

export async function approveMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .update({ 
      is_active: true, 
      accepted_at: new Date().toISOString() 
    })
    .eq('id', memberId);

  if (error) throw error;
}

export async function rejectMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function inviteMemberByUserId(
  structureId: string, 
  userId: string, 
  role: OrgRole
): Promise<{ success: boolean; error?: string }> {
  // Check if already a member
  const { data: existing } = await supabase
    .from('org_members')
    .select('id')
    .eq('structure_id', structureId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Cet utilisateur est déjà membre de la structure' };
  }

  // Add member
  const { error } = await supabase
    .from('org_members')
    .insert({
      structure_id: structureId,
      user_id: userId,
      org_role: role as any,
      is_active: true,
      accepted_at: new Date().toISOString(),
    });

  if (error) throw error;
  return { success: true };
}

export function groupMembersByRole(members: StructureMember[]): Map<OrgRole, StructureMember[]> {
  const grouped = new Map<OrgRole, StructureMember[]>();
  
  // Initialize all roles with empty arrays
  ROLE_ORDER.forEach(role => {
    grouped.set(role, []);
  });

  // Group members
  members.forEach(member => {
    const existing = grouped.get(member.org_role) || [];
    existing.push(member);
    grouped.set(member.org_role, existing);
  });

  return grouped;
}
