import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface ConsultationReason {
  id: string;
  structure_id: string;
  code: string;
  label: string;
  category: ReasonCategory;
  description: string | null;
  default_duration: number;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConsultationReasonFormData {
  code: string;
  label: string;
  category: ReasonCategory;
  description?: string | null;
  default_duration?: number;
  color?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export type ReasonCategory = 'acute' | 'chronic' | 'prevention' | 'administrative' | 'other';

export const CATEGORY_OPTIONS: { value: ReasonCategory; label: string; color: string }[] = [
  { value: 'acute', label: 'Pathologie aiguë', color: '#EF4444' },
  { value: 'chronic', label: 'Suivi chronique', color: '#8B5CF6' },
  { value: 'prevention', label: 'Prévention/Dépistage', color: '#10B981' },
  { value: 'administrative', label: 'Administratif', color: '#F59E0B' },
  { value: 'other', label: 'Autre', color: '#6B7280' },
];

export function getCategoryLabel(category: ReasonCategory): string {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
}

export function getCategoryColor(category: ReasonCategory): string {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.color || '#6B7280';
}

export async function fetchConsultationReasons(
  structureId: string,
  activeOnly: boolean = true
): Promise<ConsultationReason[]> {
  let query = supabase
    .from('consultation_reasons')
    .select('*')
    .eq('structure_id', structureId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching consultation reasons:', error);
    throw error;
  }

  return (data || []) as ConsultationReason[];
}

export async function fetchConsultationReasonsByCategory(
  structureId: string,
  category: ReasonCategory
): Promise<ConsultationReason[]> {
  const { data, error } = await supabase
    .from('consultation_reasons')
    .select('*')
    .eq('structure_id', structureId)
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching consultation reasons by category:', error);
    throw error;
  }

  return (data || []) as ConsultationReason[];
}

export async function createConsultationReason(
  structureId: string,
  formData: ConsultationReasonFormData
): Promise<ConsultationReason> {
  const { data, error } = await supabase
    .from('consultation_reasons')
    .insert({
      structure_id: structureId,
      code: formData.code,
      label: formData.label,
      category: formData.category,
      description: formData.description || null,
      default_duration: formData.default_duration ?? 15,
      color: formData.color || null,
      is_active: formData.is_active ?? true,
      sort_order: formData.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating consultation reason:', error);
    throw error;
  }

  return data as ConsultationReason;
}

export async function updateConsultationReason(
  id: string,
  formData: Partial<ConsultationReasonFormData>
): Promise<ConsultationReason> {
  const updateData: Record<string, unknown> = {};

  if (formData.code !== undefined) updateData.code = formData.code;
  if (formData.label !== undefined) updateData.label = formData.label;
  if (formData.category !== undefined) updateData.category = formData.category;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.default_duration !== undefined) updateData.default_duration = formData.default_duration;
  if (formData.color !== undefined) updateData.color = formData.color;
  if (formData.is_active !== undefined) updateData.is_active = formData.is_active;
  if (formData.sort_order !== undefined) updateData.sort_order = formData.sort_order;

  const { data, error } = await supabase
    .from('consultation_reasons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating consultation reason:', error);
    throw error;
  }

  return data as ConsultationReason;
}

export async function deleteConsultationReason(id: string): Promise<void> {
  const { error } = await supabase
    .from('consultation_reasons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting consultation reason:', error);
    throw error;
  }
}

export async function toggleConsultationReasonActive(
  id: string,
  isActive: boolean
): Promise<ConsultationReason> {
  return updateConsultationReason(id, { is_active: isActive });
}
