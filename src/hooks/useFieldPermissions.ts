import { useQuery } from '@tanstack/react-query';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from './useAuth';

export interface FieldPermission {
  field_name: string;
  can_read: boolean;
  can_write: boolean;
  can_approve: boolean;
  is_medical_decision: boolean;
  requires_signature: boolean;
}

export function useFieldPermissions(tableName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['field-permissions', tableName, user?.id],
    queryFn: async (): Promise<FieldPermission[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_user_field_permissions', {
        p_user_id: user.id,
        p_table_name: tableName,
      });

      if (error) {
        console.error('Error fetching field permissions:', error);
        return [];
      }

      return (data as FieldPermission[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });
}

export function useCanWriteField(tableName: string, fieldName: string): boolean {
  const { data: permissions = [] } = useFieldPermissions(tableName);
  const permission = permissions.find((p) => p.field_name === fieldName);
  // Si pas de permission explicite, autoriser par défaut (fallback permissif)
  return permission?.can_write ?? true;
}

export function useIsMedicalDecisionField(tableName: string, fieldName: string): boolean {
  const { data: permissions = [] } = useFieldPermissions(tableName);
  const permission = permissions.find((p) => p.field_name === fieldName);
  return permission?.is_medical_decision ?? false;
}

export function useFieldPermissionMap(tableName: string): Record<string, FieldPermission> {
  const { data: permissions = [] } = useFieldPermissions(tableName);
  return permissions.reduce((acc, p) => {
    acc[p.field_name] = p;
    return acc;
  }, {} as Record<string, FieldPermission>);
}
