import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface Team {
  id: string;
  structure_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string | null;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface NotificationRecipient {
  id: string;
  structure_id: string;
  event_key: EventKey;
  target_type: TargetType;
  target_id: string | null;
  channel: NotificationChannel;
  is_enabled: boolean;
  created_at: string;
}

export type EventKey = 'new_appointment' | 'cancel_appointment' | 'no_show' | 'urgent_alert' | 'daily_summary';
export type TargetType = 'structure' | 'team' | 'user';
export type NotificationChannel = 'email' | 'sms';

export const EVENT_KEY_LABELS: Record<EventKey, string> = {
  new_appointment: 'Nouveau rendez-vous',
  cancel_appointment: 'Annulation de RDV',
  no_show: 'Patients non venus',
  urgent_alert: 'Alertes urgentes',
  daily_summary: 'Résumé quotidien',
};

export const TEAM_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

// Default teams configuration
export const DEFAULT_TEAMS = [
  { name: 'Assistantes', color: '#ec4899', description: 'Équipe administrative et accueil' },
  { name: 'Médecins', color: '#3b82f6', description: 'Praticiens médicaux' },
  { name: 'Coordination', color: '#10b981', description: 'Équipe de coordination et gestion' },
  { name: 'PDSA', color: '#f59e0b', description: 'Permanence des soins ambulatoires' },
];

export interface TeamFormData {
  name: string;
  description?: string | null;
  color: string;
  is_active?: boolean;
}

// Teams CRUD
export async function fetchTeams(structureId: string): Promise<Team[]> {
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('structure_id', structureId)
    .order('name', { ascending: true });

  if (teamsError) throw teamsError;
  if (!teamsData) return [];

  // Get member counts
  const teamIds = teamsData.map(t => t.id);
  const { data: memberships } = await supabase
    .from('team_memberships')
    .select('team_id')
    .in('team_id', teamIds);

  const countMap = new Map<string, number>();
  (memberships || []).forEach(m => {
    countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
  });

  return teamsData.map(team => ({
    ...team,
    color: team.color || '#3b82f6',
    member_count: countMap.get(team.id) || 0,
  })) as Team[];
}

export async function createTeam(structureId: string, formData: TeamFormData): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      structure_id: structureId,
      name: formData.name,
      description: formData.description || null,
      color: formData.color,
      is_active: formData.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, color: data.color || '#3b82f6' } as Team;
}

export async function createDefaultTeams(structureId: string): Promise<Team[]> {
  const createdTeams: Team[] = [];
  
  for (const teamDef of DEFAULT_TEAMS) {
    try {
      const team = await createTeam(structureId, {
        name: teamDef.name,
        description: teamDef.description,
        color: teamDef.color,
        is_active: true,
      });
      createdTeams.push(team);
    } catch (error: unknown) {
      // Skip if team already exists (unique constraint)
      const pgError = error as { code?: string };
      if (pgError.code !== '23505') {
        throw error;
      }
    }
  }
  
  return createdTeams;
}

export async function updateTeam(id: string, formData: Partial<TeamFormData>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, color: data.color || '#3b82f6' } as Team;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Soft delete - toggle is_active
export async function toggleTeamActive(id: string, isActive: boolean): Promise<Team> {
  return updateTeam(id, { is_active: isActive });
}

// Team Memberships
export async function fetchTeamMembers(teamId: string): Promise<TeamMembership[]> {
  const { data: memberships, error } = await supabase
    .from('team_memberships')
    .select('*')
    .eq('team_id', teamId);

  if (error) throw error;
  if (!memberships || memberships.length === 0) return [];

  // Fetch profiles for users
  const userIds = memberships.map(m => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);

  const profileMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  (profiles || []).forEach(p => {
    profileMap.set(p.user_id, { first_name: p.first_name, last_name: p.last_name });
  });

  return memberships.map(m => ({
    ...m,
    profile: profileMap.get(m.user_id),
  })) as TeamMembership[];
}

export async function addTeamMember(teamId: string, userId: string, roleInTeam?: string): Promise<TeamMembership> {
  // team_memberships requires structure_id (per generated DB types)
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('structure_id')
    .eq('id', teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team?.structure_id) {
    throw new Error('Structure non trouvée pour cette équipe');
  }

  const { data, error } = await supabase
    .from('team_memberships')
    // Supabase typings expect an array for insert() in this project
    .insert([
      {
        structure_id: team.structure_id,
        team_id: teamId,
        user_id: userId,
        role_in_team: roleInTeam || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as TeamMembership;
}

export async function removeTeamMember(membershipId: string): Promise<void> {
  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('id', membershipId);

  if (error) throw error;
}

// Notification Recipients
export async function fetchNotificationRecipients(structureId: string): Promise<NotificationRecipient[]> {
  const { data, error } = await supabase
    .from('notification_recipients')
    .select('*')
    .eq('structure_id', structureId);

  if (error) throw error;
  return (data || []) as NotificationRecipient[];
}

export async function upsertNotificationRecipient(
  structureId: string,
  eventKey: EventKey,
  targetType: TargetType,
  targetId: string | null,
  channel: NotificationChannel = 'email',
  isEnabled: boolean = true
): Promise<NotificationRecipient> {
  const { data, error } = await supabase
    .from('notification_recipients')
    .upsert({
      structure_id: structureId,
      event_key: eventKey,
      target_type: targetType,
      target_id: targetId,
      channel,
      is_enabled: isEnabled,
    }, {
      onConflict: 'event_key,target_type,target_id,channel,structure_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationRecipient;
}

export async function deleteNotificationRecipients(
  structureId: string,
  eventKey: EventKey,
  channel: NotificationChannel = 'email'
): Promise<void> {
  const { error } = await supabase
    .from('notification_recipients')
    .delete()
    .eq('structure_id', structureId)
    .eq('event_key', eventKey)
    .eq('channel', channel);

  if (error) throw error;
}

export async function setEventRecipients(
  structureId: string,
  eventKey: EventKey,
  targetType: TargetType,
  targetIds: string[], // empty for 'structure', team ids for 'team', user ids for 'user'
  channel: NotificationChannel = 'email',
  isEnabled: boolean = true
): Promise<void> {
  // First delete existing for this event
  await deleteNotificationRecipients(structureId, eventKey, channel);

  // If 'structure', create one record with null target_id
  if (targetType === 'structure') {
    await upsertNotificationRecipient(structureId, eventKey, 'structure', null, channel, isEnabled);
    return;
  }

  // For 'team' or 'user', create records for each target
  for (const targetId of targetIds) {
    await upsertNotificationRecipient(structureId, eventKey, targetType, targetId, channel, isEnabled);
  }
}

// Helper to get team names by IDs
export async function getTeamNamesByIds(teamIds: string[]): Promise<Map<string, string>> {
  if (teamIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', teamIds);

  if (error) throw error;
  
  const map = new Map<string, string>();
  (data || []).forEach(t => map.set(t.id, t.name));
  return map;
}
