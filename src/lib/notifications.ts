import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'task' | 'appointment' | 'queue' | 'message';

export interface Notification {
  id: string;
  structure_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  structure_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
}

export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
  return count || 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

export async function createNotification(
  userId: string,
  structureId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string | null
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      structure_id: structureId,
      title,
      message,
      type,
      link: link || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}
