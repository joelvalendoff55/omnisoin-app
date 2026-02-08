import { useQuery } from '@tanstack/react-query';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

interface SystemPromptResult {
  content: string | null;
  version: number;
  isActive: boolean;
}

export function useSystemPrompt(slug: string) {
  return useQuery({
    queryKey: ['system-prompt', slug],
    queryFn: async (): Promise<SystemPromptResult | null> => {
      // First get the prompt by slug
      const { data: prompt, error: promptError } = await supabase
        .from('system_prompts')
        .select('id, is_active')
        .eq('slug', slug)
        .maybeSingle();

      if (promptError) {
        console.error('Error fetching system prompt:', promptError);
        return null;
      }

      if (!prompt || !prompt.is_active) {
        return null;
      }

      // Then get the published version
      const { data: version, error: versionError } = await supabase
        .from('prompt_versions')
        .select('content, version')
        .eq('prompt_id', prompt.id)
        .eq('is_published', true)
        .maybeSingle();

      if (versionError) {
        console.error('Error fetching prompt version:', versionError);
        return null;
      }

      if (!version) {
        return null;
      }

      return {
        content: version.content,
        version: version.version,
        isActive: prompt.is_active ?? true,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Utility function for edge functions or server-side
export async function getSystemPromptBySlug(slug: string): Promise<string | null> {
  const { data: prompt, error: promptError } = await supabase
    .from('system_prompts')
    .select('id, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (promptError || !prompt) {
    return null;
  }

  const { data: version, error: versionError } = await supabase
    .from('prompt_versions')
    .select('content')
    .eq('prompt_id', prompt.id)
    .eq('is_published', true)
    .maybeSingle();

  if (versionError || !version) {
    return null;
  }

  return version.content;
}
