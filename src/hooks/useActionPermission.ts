import { useMemo } from 'react';
import { useRole } from '@/hooks/useRole';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useQuery } from '@tanstack/react-query';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { useAuth } from '@/hooks/useAuth';

export type ResourceType = 
  | 'patients' 
  | 'transcripts' 
  | 'consultations' 
  | 'cotation' 
  | 'documents' 
  | 'inbox' 
  | 'queue' 
  | 'team' 
  | 'settings' 
  | 'audit' 
  | 'compliance';

export type ActionType = 
  | 'read' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'validate' 
  | 'export';

interface Permission {
  role: string;
  resource_type: string;
  action: string;
  is_allowed: boolean;
  requires_health_data_flag: boolean;
  description: string | null;
}

interface UseActionPermissionResult {
  canPerform: (resource: ResourceType, action: ActionType) => boolean;
  permissions: Permission[];
  loading: boolean;
  error: Error | null;
}

export function useActionPermission(): UseActionPermissionResult {
  const { user } = useAuth();
  const { roles, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const { healthDataEnabled, loading: flagsLoading } = useFeatureFlags();

  // Fetch all role_action_permissions
  const { data: allPermissions = [], isLoading: permissionsLoading, error } = useQuery({
    queryKey: ['role_action_permissions'],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await supabase
        .from('role_action_permissions')
        .select('*');

      if (error) {
        console.error('Error fetching permissions:', error);
        throw error;
      }

      return (data || []) as Permission[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // Cache 10 minutes
  });

  // Build a map of permissions for the user's roles
  const permissionsMap = useMemo(() => {
    const map: Record<string, Permission> = {};
    
    roles.forEach(role => {
      allPermissions
        .filter(p => p.role === role)
        .forEach(p => {
          const key = `${p.resource_type}:${p.action}`;
          // If any role allows, allow (OR logic)
          if (!map[key] || (p.is_allowed && !map[key].is_allowed)) {
            map[key] = p;
          }
        });
    });
    
    return map;
  }, [roles, allPermissions]);

  const canPerform = (resource: ResourceType, action: ActionType): boolean => {
    const key = `${resource}:${action}`;
    const permission = permissionsMap[key];

    if (!permission) {
      return false;
    }

    if (!permission.is_allowed) {
      return false;
    }

    // Check health_data_enabled flag if required
    if (permission.requires_health_data_flag && !healthDataEnabled) {
      return false;
    }

    return true;
  };

  const userPermissions = useMemo(() => {
    return Object.values(permissionsMap);
  }, [permissionsMap]);

  return {
    canPerform,
    permissions: userPermissions,
    loading: roleLoading || structureLoading || flagsLoading || permissionsLoading,
    error: error instanceof Error ? error : null,
  };
}

// Convenience hook for checking a single permission
export function useCanPerform(resource: ResourceType, action: ActionType): boolean {
  const { canPerform, loading } = useActionPermission();
  
  if (loading) {
    return false; // Safe default during loading
  }
  
  return canPerform(resource, action);
}
