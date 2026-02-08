import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type PromptCategory = 'assistant' | 'summary' | 'transcription' | 'analysis' | 'other' | 'clinical_suggestions' | 'ocr_extraction' | 'stt_processing' | 'summary_generator' | 'transcript_cleaner' | 'assistant_system';

export interface SystemPrompt {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  content: string;
  is_published: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by: string;
  created_at: string;
  notes: string | null;
  temperature: number | null;
  max_tokens: number | null;
}

export interface PromptTest {
  id: string;
  version_id: string;
  input: string;
  expected_output: string | null;
  actual_output: string | null;
  passed: boolean | null;
  tested_by: string;
  tested_at: string;
}

export async function getPrompts(): Promise<SystemPrompt[]> {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('*')
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) throw error;
  return (data || []) as SystemPrompt[];
}

export async function getPromptById(id: string): Promise<SystemPrompt | null> {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as SystemPrompt | null;
}

export async function createPrompt(prompt: Omit<SystemPrompt, 'id' | 'created_at' | 'updated_at'>): Promise<SystemPrompt> {
  const { data, error } = await supabase
    .from('system_prompts')
    .insert([prompt])
    .select()
    .single();

  if (error) throw error;
  return data as SystemPrompt;
}

export async function updatePrompt(id: string, updates: Partial<Pick<SystemPrompt, 'display_name' | 'description' | 'category'>>): Promise<SystemPrompt> {
  const { data, error } = await supabase
    .from('system_prompts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SystemPrompt;
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase
    .from('system_prompts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getVersions(promptId: string): Promise<PromptVersion[]> {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getVersionById(id: string): Promise<PromptVersion | null> {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createVersion(
  promptId: string,
  content: string,
  notes: string | null,
  createdBy: string,
  temperature?: number,
  maxTokens?: number
): Promise<PromptVersion> {
  // Get the latest version number
  const { data: latestVersion } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latestVersion?.version || 0) + 1;

  const { data, error } = await supabase
    .from('prompt_versions')
    .insert({
      prompt_id: promptId,
      version: newVersion,
      content,
      notes,
      created_by: createdBy,
      is_published: false,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 2048,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function publishVersion(versionId: string, userId: string): Promise<PromptVersion> {
  // Get the version to find its prompt_id
  const version = await getVersionById(versionId);
  if (!version) throw new Error('Version not found');

  // Unpublish all other versions of this prompt
  await supabase
    .from('prompt_versions')
    .update({ is_published: false, published_at: null, published_by: null })
    .eq('prompt_id', version.prompt_id);

  // Publish this version
  const { data, error } = await supabase
    .from('prompt_versions')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: userId,
    })
    .eq('id', versionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rollbackVersion(
  versionId: string,
  userId: string
): Promise<PromptVersion> {
  // Get the version to rollback to
  const oldVersion = await getVersionById(versionId);
  if (!oldVersion) throw new Error('Version not found');

  // Create a new version with the old content
  const newVersion = await createVersion(
    oldVersion.prompt_id,
    oldVersion.content,
    `Rollback vers la version ${oldVersion.version}`,
    userId
  );

  // Publish the new version
  return publishVersion(newVersion.id, userId);
}

export async function getPublishedPrompt(name: string): Promise<string | null> {
  const { data: prompt } = await supabase
    .from('system_prompts')
    .select('id')
    .eq('name', name)
    .single();

  if (!prompt) return null;

  const { data: version } = await supabase
    .from('prompt_versions')
    .select('content')
    .eq('prompt_id', prompt.id)
    .eq('is_published', true)
    .single();

  return version?.content || null;
}

export async function getTests(versionId: string): Promise<PromptTest[]> {
  const { data, error } = await supabase
    .from('prompt_tests')
    .select('*')
    .eq('version_id', versionId)
    .order('tested_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTest(
  versionId: string,
  input: string,
  expectedOutput: string | null,
  testedBy: string
): Promise<PromptTest> {
  const { data, error } = await supabase
    .from('prompt_tests')
    .insert({
      version_id: versionId,
      input,
      expected_output: expectedOutput,
      tested_by: testedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTest(
  testId: string,
  actualOutput: string,
  passed: boolean
): Promise<PromptTest> {
  const { data, error } = await supabase
    .from('prompt_tests')
    .update({
      actual_output: actualOutput,
      passed,
    })
    .eq('id', testId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    assistant: 'Assistant',
    summary: 'Synthèses',
    transcription: 'Transcription',
    analysis: 'Analyse',
    clinical_suggestions: 'Suggestions cliniques',
    medecin: 'Médecin',
    other: 'Autre',
  };
  return labels[category] || category;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    assistant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    summary: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    transcription: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    analysis: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    clinical_suggestions: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    medecin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[category] || colors.other;
}
