import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface Structure {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StructureWithStats extends Structure {
  member_count: number;
  admin_count: number;
}

export interface GlobalStats {
  totalStructures: number;
  activeStructures: number;
  totalPatients: number;
  totalTranscripts: number;
  totalUsers: number;
  totalPrompts: number;
  totalConsultations: number;
}

export interface SystemPromptWithVersion {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  published_version?: number;
  published_content?: string;
}

export interface SuperAdminUser {
  id: string;
  member_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  structure_id: string | null;
  structure_name: string | null;
  org_role: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SuperAdminAuditLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  structure_id: string | null;
  structure_name?: string | null;
  details: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface SuperAdminStatsRPC {
  total_structures: number;
  active_structures: number;
  total_patients: number;
  total_transcripts: number;
  total_users: number;
  total_prompts: number;
  total_consultations: number;
}

// Use RPC function for global stats (more secure)
export async function getGlobalStats(): Promise<GlobalStats> {
  const { data, error } = await supabase.rpc('get_super_admin_stats');
  
  if (error) {
    console.error('Error fetching super admin stats:', error);
    // Fallback to direct queries if RPC not available
    return getGlobalStatsFallback();
  }
  
  const stats = data as unknown as SuperAdminStatsRPC;
  
  return {
    totalStructures: stats?.total_structures || 0,
    activeStructures: stats?.active_structures || 0,
    totalPatients: stats?.total_patients || 0,
    totalTranscripts: stats?.total_transcripts || 0,
    totalUsers: stats?.total_users || 0,
    totalPrompts: stats?.total_prompts || 0,
    totalConsultations: stats?.total_consultations || 0,
  };
}

// Fallback if RPC not available
async function getGlobalStatsFallback(): Promise<GlobalStats> {
  const [
    structuresRes,
    patientsRes,
    transcriptsRes,
    profilesRes,
    promptsRes,
    consultationsRes,
  ] = await Promise.all([
    supabase.from('structures').select('id, is_active'),
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('patient_transcripts').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('system_prompts').select('id', { count: 'exact', head: true }),
    supabase.from('consultations').select('id', { count: 'exact', head: true }),
  ]);

  const structures = structuresRes.data || [];
  
  return {
    totalStructures: structures.length,
    activeStructures: structures.filter(s => s.is_active).length,
    totalPatients: patientsRes.count || 0,
    totalTranscripts: transcriptsRes.count || 0,
    totalUsers: profilesRes.count || 0,
    totalPrompts: promptsRes.count || 0,
    totalConsultations: consultationsRes.count || 0,
  };
}

// Get structures with stats via RPC
export async function getAllStructuresWithStats(): Promise<StructureWithStats[]> {
  const { data, error } = await supabase.rpc('get_all_structures_with_stats');
  
  if (error) {
    console.error('Error fetching structures with stats:', error);
    // Fallback
    return getAllStructures() as Promise<StructureWithStats[]>;
  }
  
  return (data || []).map((s: any) => ({
    ...s,
    member_count: s.member_count || 0,
    admin_count: s.admin_count || 0,
  }));
}

export async function getAllStructures(): Promise<Structure[]> {
  const { data, error } = await supabase
    .from('structures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching structures:', error);
    throw error;
  }

  return data || [];
}

// Get all org admins (admin/owner roles from org_members)
export async function getAllUsersForAdmin(): Promise<SuperAdminUser[]> {
  const { data, error } = await supabase.rpc('get_all_org_admins');
  
  if (error) {
    console.error('Error fetching org admins:', error);
    throw error;
  }
  
  // Transform the RPC response to match our interface
  return (data || []).map((u: any) => ({
    id: u.user_id,
    member_id: u.member_id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    structure_id: u.structure_id,
    structure_name: u.structure_name,
    org_role: u.org_role,
    roles: u.org_role ? [u.org_role] : [],
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));
}

// Toggle structure active status
export async function toggleStructureStatus(structureId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc('super_admin_toggle_structure', {
    _structure_id: structureId,
    _is_active: isActive,
  });
  
  if (error) {
    console.error('Error toggling structure:', error);
    throw error;
  }
}

// Deactivate a user globally
export async function deactivateUser(userId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('super_admin_deactivate_user', {
    _target_user_id: userId,
    _reason: reason || 'Désactivé par super admin',
  });
  
  if (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
}

// Reactivate a user
export async function reactivateUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('super_admin_reactivate_user', {
    _target_user_id: userId,
  });
  
  if (error) {
    console.error('Error reactivating user:', error);
    throw error;
  }
}

// Update user role
export type AppRole = 'admin' | 'coordinator' | 'practitioner' | 'nurse' | 'ipa' | 'assistant' | 'prompt_admin' | 'super_admin';

export const APP_ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'coordinator', label: 'Coordinateur' },
  { value: 'practitioner', label: 'Praticien' },
  { value: 'nurse', label: 'Infirmier' },
  { value: 'ipa', label: 'IPA' },
  { value: 'assistant', label: 'Assistant' },
];

export async function updateUserRole(userId: string, newRole: AppRole): Promise<void> {
  const { error } = await supabase.rpc('update_user_role', {
    _target_user_id: userId,
    _new_role: newRole,
  });
  
  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// Get super admin audit logs
export async function getSuperAdminAuditLogs(limit = 100): Promise<SuperAdminAuditLog[]> {
  const { data, error } = await supabase.rpc('get_super_admin_security_logs', {
    _limit: limit,
  });
  
  if (error) {
    console.error('Error fetching super admin logs:', error);
    // Fallback to activity_logs
    const fallbackData = await getGlobalActivityLogs(limit);
    return fallbackData.map(log => ({
      id: log.id,
      user_id: log.actor_user_id || '',
      action: log.action,
      target_type: null,
      target_id: log.patient_id,
      structure_id: log.structure_id,
      details: log.metadata as Record<string, unknown> | null,
      created_at: log.created_at,
    }));
  }
  
  // Transform RPC response to match our interface
  return (data || []).map((log: any) => ({
    id: log.id,
    user_id: log.user_id,
    action: log.action,
    target_type: log.target_type,
    target_id: log.target_id,
    structure_id: null,
    structure_name: log.structure_name,
    details: log.details as Record<string, unknown> | null,
    created_at: log.created_at,
    user_email: log.user_email,
    user_name: log.user_name,
  }));
}

export async function getSystemPromptsWithVersions(): Promise<SystemPromptWithVersion[]> {
  const { data: prompts, error: promptsError } = await supabase
    .from('system_prompts')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (promptsError) {
    console.error('Error fetching prompts:', promptsError);
    throw promptsError;
  }

  // Get published versions for all prompts
  const { data: versions, error: versionsError } = await supabase
    .from('prompt_versions')
    .select('prompt_id, version, content')
    .eq('is_published', true);

  if (versionsError) {
    console.error('Error fetching versions:', versionsError);
    throw versionsError;
  }

  const versionMap = new Map(
    versions?.map(v => [v.prompt_id, { version: v.version, content: v.content }]) || []
  );

  return (prompts || []).map(prompt => ({
    ...prompt,
    is_active: prompt.is_active ?? true,
    published_version: versionMap.get(prompt.id)?.version,
    published_content: versionMap.get(prompt.id)?.content,
  }));
}

export async function createSystemPrompt(data: {
  name: string;
  slug: string;
  display_name: string;
  description?: string;
  category: string;
}): Promise<string> {
  const { data: prompt, error } = await supabase
    .from('system_prompts')
    .insert({
      name: data.name,
      slug: data.slug,
      display_name: data.display_name,
      description: data.description || null,
      category: data.category,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating prompt:', error);
    throw error;
  }

  return prompt.id;
}

export async function updateSystemPrompt(id: string, data: {
  name?: string;
  slug?: string;
  display_name?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('system_prompts')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Error updating prompt:', error);
    throw error;
  }
}

export async function deleteSystemPrompt(id: string): Promise<void> {
  // First delete all versions
  const { error: versionsError } = await supabase
    .from('prompt_versions')
    .delete()
    .eq('prompt_id', id);

  if (versionsError) {
    console.error('Error deleting versions:', versionsError);
    throw versionsError;
  }

  // Then delete the prompt
  const { error } = await supabase
    .from('system_prompts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting prompt:', error);
    throw error;
  }
}

export async function getGlobalActivityLogs(limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      id,
      action,
      structure_id,
      actor_user_id,
      patient_id,
      metadata,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }

  return data || [];
}

// Get consultations for stats (dates only)
export async function getConsultationsForStats(): Promise<{ created_at: string }[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select('created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching consultations for stats:', error);
    return [];
  }

  return data || [];
}

// Get transcripts for stats (dates only)
export async function getTranscriptsForStats(): Promise<{ created_at: string }[]> {
  const { data, error } = await supabase
    .from('patient_transcripts')
    .select('created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transcripts for stats:', error);
    return [];
  }

  return data || [];
}

// Get structure activity stats (patients and consultations per structure)
export interface StructureActivityStats {
  structure_id: string;
  structure_name: string;
  patient_count: number;
  consultation_count: number;
  transcript_count: number;
}

export async function getStructureActivityStats(): Promise<StructureActivityStats[]> {
  // Get all structures
  const { data: structures, error: structuresError } = await supabase
    .from('structures')
    .select('id, name')
    .eq('is_active', true);

  if (structuresError || !structures) {
    console.error('Error fetching structures:', structuresError);
    return [];
  }

  // Get patient counts per structure
  const { data: patientCounts, error: patientsError } = await supabase
    .from('patients')
    .select('structure_id')
    .eq('is_archived', false);

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
  }

  // Get consultation counts per structure
  const { data: consultationCounts, error: consultationsError } = await supabase
    .from('consultations')
    .select('structure_id');

  if (consultationsError) {
    console.error('Error fetching consultations:', consultationsError);
  }

  // Get transcript counts per structure
  const { data: transcriptCounts, error: transcriptsError } = await supabase
    .from('patient_transcripts')
    .select('structure_id');

  if (transcriptsError) {
    console.error('Error fetching transcripts:', transcriptsError);
  }

  // Aggregate counts
  const patientsByStructure = new Map<string, number>();
  const consultationsByStructure = new Map<string, number>();
  const transcriptsByStructure = new Map<string, number>();

  (patientCounts || []).forEach(p => {
    if (p.structure_id) {
      patientsByStructure.set(p.structure_id, (patientsByStructure.get(p.structure_id) || 0) + 1);
    }
  });

  (consultationCounts || []).forEach(c => {
    if (c.structure_id) {
      consultationsByStructure.set(c.structure_id, (consultationsByStructure.get(c.structure_id) || 0) + 1);
    }
  });

  (transcriptCounts || []).forEach(t => {
    if (t.structure_id) {
      transcriptsByStructure.set(t.structure_id, (transcriptsByStructure.get(t.structure_id) || 0) + 1);
    }
  });

  // Build result
  const result: StructureActivityStats[] = structures.map(s => ({
    structure_id: s.id,
    structure_name: s.name,
    patient_count: patientsByStructure.get(s.id) || 0,
    consultation_count: consultationsByStructure.get(s.id) || 0,
    transcript_count: transcriptsByStructure.get(s.id) || 0,
  }));

  // Sort by total activity (patients + consultations + transcripts) descending
  result.sort((a, b) => 
    (b.patient_count + b.consultation_count + b.transcript_count) - (a.patient_count + a.consultation_count + a.transcript_count)
  );

  return result;
}

export const PROMPT_CATEGORIES = [
  { value: 'assistant', label: 'Assistant' },
  { value: 'summary', label: 'Résumé' },
  { value: 'transcription', label: 'Transcription' },
  { value: 'clinical_suggestions', label: 'Suggestions cliniques' },
  { value: 'ocr_extraction', label: 'Extraction OCR' },
  { value: 'stt_processing', label: 'Traitement STT' },
  { value: 'summary_generator', label: 'Génération de résumés' },
  { value: 'transcript_cleaner', label: 'Nettoyage de transcriptions' },
  { value: 'assistant_system', label: 'Assistant système' },
] as const;

export function getCategoryLabel(category: string): string {
  const cat = PROMPT_CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
}

// Create a new version for a prompt
export async function createPromptVersion(
  promptId: string,
  content: string,
  userId: string
): Promise<void> {
  // Get the latest version number
  const { data: latestVersion } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latestVersion?.version || 0) + 1;

  // Unpublish all existing versions
  await supabase
    .from('prompt_versions')
    .update({ is_published: false })
    .eq('prompt_id', promptId);

  // Create new version and publish it
  const { error } = await supabase
    .from('prompt_versions')
    .insert({
      prompt_id: promptId,
      version: newVersion,
      content: content,
      created_by: userId,
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: userId,
    });

  if (error) {
    console.error('Error creating version:', error);
    throw error;
  }
}
