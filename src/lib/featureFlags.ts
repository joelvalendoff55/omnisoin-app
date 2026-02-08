import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

/**
 * Feature flag names used in the application
 */
export const FEATURE_FLAGS = {
  HEALTH_DATA_ENABLED: 'health_data_enabled',
  MFA_REQUIRED: 'mfa_required',
  ADVANCED_AUDIT: 'advanced_audit',
  CLINICAL_SUGGESTIONS: 'clinical_suggestions',
} as const;

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * Check if a feature flag is enabled for a structure (server-side RPC call)
 */
export async function isFeatureEnabled(
  structureId: string,
  flagName: FeatureFlagName
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_structure_id: structureId,
    p_flag_name: flagName,
  });

  if (error) {
    console.error('Error checking feature flag:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if user can perform an action on a resource (server-side RPC call)
 */
export async function canPerformAction(
  userId: string,
  structureId: string,
  resourceType: string,
  action: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_perform_action', {
    p_user_id: userId,
    p_structure_id: structureId,
    p_resource_type: resourceType,
    p_action: action,
  });

  if (error) {
    console.error('Error checking action permission:', error);
    return false;
  }

  return data === true;
}

/**
 * Enable/disable a feature flag for a structure (admin only)
 */
export async function setFeatureFlag(
  structureId: string,
  flagName: FeatureFlagName,
  enabled: boolean,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('feature_flags')
    .upsert(
      {
        structure_id: structureId,
        flag_name: flagName,
        is_enabled: enabled,
        description: description || null,
      },
      {
        onConflict: 'structure_id,flag_name',
      }
    );

  if (error) {
    console.error('Error setting feature flag:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all feature flags for a structure
 */
export async function getFeatureFlags(
  structureId: string
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('flag_name, is_enabled')
    .eq('structure_id', structureId);

  if (error) {
    console.error('Error fetching feature flags:', error);
    return {};
  }

  const flags: Record<string, boolean> = {};
  (data || []).forEach((flag) => {
    flags[flag.flag_name] = flag.is_enabled;
  });

  return flags;
}
