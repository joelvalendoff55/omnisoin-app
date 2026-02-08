import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

/**
 * Create a new structure and assign admin role to the user
 */
export async function createStructureWithAdmin(
  userId: string,
  structureName: string,
  structureSlug?: string
): Promise<{ structureId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_structure_with_admin', {
    _user_id: userId,
    _structure_name: structureName,
    _structure_slug: structureSlug || null,
  });

  if (error) {
    console.error('Error creating structure:', error);
    return { structureId: null, error: error.message };
  }

  return { structureId: data as string, error: null };
}

/**
 * Join an existing structure by slug
 * First user to join becomes admin if no admin exists
 */
export async function joinStructureBySlug(
  userId: string,
  structureSlug: string
): Promise<{
  success: boolean;
  structureId?: string;
  role?: string;
  isFirstAdmin?: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('join_structure_with_code', {
    _user_id: userId,
    _structure_slug: structureSlug,
  });

  if (error) {
    console.error('Error joining structure:', error);
    return { success: false, error: error.message };
  }

  const result = data as {
    success: boolean;
    structure_id?: string;
    role?: string;
    is_first_admin?: boolean;
    error?: string;
  };

  return {
    success: result.success,
    structureId: result.structure_id,
    role: result.role,
    isFirstAdmin: result.is_first_admin,
    error: result.error,
  };
}
