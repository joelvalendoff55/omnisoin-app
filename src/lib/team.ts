import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface TeamMember {
  id: string;
  user_id: string;
  structure_id: string;
  job_title: string;
  specialty: string | null;
  professional_id: string | null;
  is_available: boolean;
  works_pdsa: boolean;
  max_patients_per_day: number | null;
  professional_phone: string | null;
  professional_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface TeamMemberFormData {
  user_id: string;
  job_title: string;
  specialty?: string | null;
  professional_id?: string | null;
  is_available?: boolean;
  works_pdsa?: boolean;
  max_patients_per_day?: number | null;
  professional_phone?: string | null;
  professional_email?: string | null;
  notes?: string | null;
}

export const JOB_TITLE_OPTIONS = [
  { value: 'medecin', label: 'Médecin' },
  { value: 'infirmier', label: 'Infirmier(ère)' },
  { value: 'aide_soignant', label: 'Aide-soignant(e)' },
  { value: 'secretaire', label: 'Secrétaire médical(e)' },
  { value: 'kinesitherapeute', label: 'Kinésithérapeute' },
  { value: 'pharmacien', label: 'Pharmacien(ne)' },
  { value: 'sage_femme', label: 'Sage-femme' },
  { value: 'psychologue', label: 'Psychologue' },
  { value: 'dieteticien', label: 'Diététicien(ne)' },
  { value: 'orthophoniste', label: 'Orthophoniste' },
  { value: 'coordinateur', label: 'Coordinateur(rice)' },
  { value: 'autre', label: 'Autre' },
] as const;

export const SPECIALTY_OPTIONS = [
  { value: 'generaliste', label: 'Médecine générale' },
  { value: 'cardiologie', label: 'Cardiologie' },
  { value: 'dermatologie', label: 'Dermatologie' },
  { value: 'pediatrie', label: 'Pédiatrie' },
  { value: 'gynecologie', label: 'Gynécologie' },
  { value: 'psychiatrie', label: 'Psychiatrie' },
  { value: 'ophtalmologie', label: 'Ophtalmologie' },
  { value: 'orl', label: 'ORL' },
  { value: 'rhumatologie', label: 'Rhumatologie' },
  { value: 'neurologie', label: 'Neurologie' },
  { value: 'autre', label: 'Autre' },
] as const;

export async function fetchTeamMembers(structureId: string): Promise<TeamMember[]> {
  // Fetch team members
  const { data: teamData, error: teamError } = await supabase
    .from('team_members')
    .select('*')
    .eq('structure_id', structureId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (teamError) throw teamError;
  if (!teamData || teamData.length === 0) return [];

  // Fetch profiles for these user_ids
  const userIds = teamData.map((m) => m.user_id);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);

  // Map profiles by user_id
  const profilesMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  (profilesData || []).forEach((p) => {
    profilesMap.set(p.user_id, { first_name: p.first_name, last_name: p.last_name });
  });

  // Merge
  return teamData.map((member) => ({
    ...member,
    profile: profilesMap.get(member.user_id) || undefined,
  })) as TeamMember[];
}

export async function fetchTeamMemberById(id: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as TeamMember | null;
}

export async function createTeamMember(
  structureId: string,
  formData: TeamMemberFormData
): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      structure_id: structureId,
      user_id: formData.user_id,
      job_title: formData.job_title,
      specialty: formData.specialty || null,
      professional_id: formData.professional_id || null,
      is_available: formData.is_available ?? true,
      works_pdsa: formData.works_pdsa ?? false,
      max_patients_per_day: formData.max_patients_per_day || null,
      professional_phone: formData.professional_phone || null,
      professional_email: formData.professional_email || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TeamMember;
}

export async function updateTeamMember(
  id: string,
  formData: Partial<TeamMemberFormData>
): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as TeamMember;
}

export async function deactivateTeamMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export function getJobTitleLabel(value: string): string {
  const option = JOB_TITLE_OPTIONS.find((o) => o.value === value);
  return option?.label || value;
}

export function getSpecialtyLabel(value: string | null): string {
  if (!value) return '';
  const option = SPECIALTY_OPTIONS.find((o) => o.value === value);
  return option?.label || value;
}
