import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activity';

export type InboxChannel = 'whatsapp' | 'web';
export type InboxMessageType = 'text' | 'audio' | 'image' | 'document';
export type InboxStatus = 'received' | 'processing' | 'ready' | 'failed';

export interface InboxMessage {
  id: string;
  structure_id: string;
  patient_id: string | null;
  channel: InboxChannel;
  external_conversation_id: string | null;
  external_message_id: string | null;
  sender_phone: string | null;
  message_type: InboxMessageType;
  text_body: string | null;
  media_url: string | null;
  media_mime: string | null;
  status: InboxStatus;
  created_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface InboxFilters {
  unassignedOnly?: boolean;
  status?: InboxStatus | 'all';
  period?: '24h' | '7d' | '30d' | 'all';
}

export async function fetchInboxMessages(
  structureId: string,
  filters: InboxFilters = {}
): Promise<InboxMessage[]> {
  const { unassignedOnly = false, status = 'all', period = '7d' } = filters;

  // Calculate date filter
  let dateFilter: string | null = null;
  const now = new Date();
  if (period === '24h') {
    dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  } else if (period === '7d') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === '30d') {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  let query = supabase
    .from('inbox_messages')
    .select('*')
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (unassignedOnly) {
    query = query.is('patient_id', null);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (dateFilter) {
    query = query.gte('created_at', dateFilter);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await query as any;

  if (error) {
    throw error;
  }

  // Fetch associated patients
  const patientIds: string[] = (data || [])
    .filter((m: InboxMessage) => m.patient_id)
    .map((m: InboxMessage) => m.patient_id as string);
  const uniquePatientIds = Array.from(new Set(patientIds));

  let patientMap = new Map<string, { id: string; first_name: string; last_name: string }>();

  if (uniquePatientIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .in('id', uniquePatientIds as string[]);

    patientMap = new Map((patients || []).map((p) => [p.id, p]));
  }

  return (data || []).map((msg: InboxMessage) => ({
    ...msg,
    patient: msg.patient_id ? patientMap.get(msg.patient_id) : undefined,
  }));
}

export async function assignMessageToPatient(
  messageId: string,
  patientId: string,
  structureId: string,
  actorUserId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('inbox_messages')
    .update({ patient_id: patientId })
    .eq('id', messageId) as any);

  if (error) {
    throw error;
  }

  await logActivity({
    structureId,
    actorUserId,
    action: 'INBOX_ASSIGNED',
    patientId,
    metadata: { message_id: messageId },
  });
}

export async function getInboxMessageById(messageId: string): Promise<InboxMessage | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('inbox_messages')
    .select('*')
    .eq('id', messageId)
    .single() as any);

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as InboxMessage;
}
