"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from './useStructureId';

export interface PractitionerMessage {
  id: string;
  patient_id: string;
  patient_name: string;
  practitioner_id: string | null;
  subject: string | null;
  content: string;
  is_read: boolean;
  direction: 'patient_to_practitioner' | 'practitioner_to_patient';
  created_at: string;
  read_at: string | null;
}

export interface PatientConversation {
  patient_id: string;
  patient_name: string;
  last_message: string;
  last_message_date: Date;
  unread_count: number;
  messages: PractitionerMessage[];
}

export function usePractitionerMessages() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [messages, setMessages] = useState<PractitionerMessage[]>([]);
  const [conversations, setConversations] = useState<PatientConversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!structureId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('patient_messages')
        .select(`
          id,
          patient_id,
          practitioner_id,
          subject,
          content,
          is_read,
          direction,
          created_at,
          read_at,
          patient:patients(id, first_name, last_name)
        `)
        .eq('structure_id', structureId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedMessages: PractitionerMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        patient_id: msg.patient_id,
        patient_name: msg.patient 
          ? `${msg.patient.first_name || ''} ${msg.patient.last_name || ''}`.trim() 
          : 'Patient inconnu',
        practitioner_id: msg.practitioner_id,
        subject: msg.subject,
        content: msg.content,
        is_read: msg.is_read,
        direction: msg.direction,
        created_at: msg.created_at,
        read_at: msg.read_at,
      }));

      setMessages(formattedMessages);

      // Group into conversations
      const conversationMap = new Map<string, PractitionerMessage[]>();
      formattedMessages.forEach((msg) => {
        if (!conversationMap.has(msg.patient_id)) {
          conversationMap.set(msg.patient_id, []);
        }
        conversationMap.get(msg.patient_id)!.push(msg);
      });

      const grouped: PatientConversation[] = Array.from(conversationMap.entries()).map(
        ([patientId, msgs]) => {
          const sorted = msgs.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const lastMsg = sorted[0];
          const unread = msgs.filter(
            (m) => !m.is_read && m.direction === 'patient_to_practitioner'
          ).length;

          return {
            patient_id: patientId,
            patient_name: lastMsg.patient_name,
            last_message: lastMsg.content,
            last_message_date: new Date(lastMsg.created_at),
            unread_count: unread,
            messages: sorted.reverse(),
          };
        }
      );

      setConversations(
        grouped.sort((a, b) => b.last_message_date.getTime() - a.last_message_date.getTime())
      );

      // Count total unread
      const totalUnread = formattedMessages.filter(
        (m) => !m.is_read && m.direction === 'patient_to_practitioner'
      ).length;
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Error fetching practitioner messages:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  // Send reply to patient
  const sendReply = async (patientId: string, content: string, subject?: string) => {
    if (!structureId) return null;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error: insertError } = await supabase
      .from('patient_messages')
      .insert({
        patient_id: patientId,
        practitioner_id: userData.user.id,
        structure_id: structureId,
        content,
        subject: subject || null,
        direction: 'practitioner_to_patient',
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error sending reply:', insertError);
      return null;
    }

    await fetchMessages();
    return data;
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    const { error: updateError } = await supabase
      .from('patient_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error marking message as read:', updateError);
      return false;
    }

    await fetchMessages();
    return true;
  };

  // Mark all messages from a patient as read
  const markConversationAsRead = async (patientId: string) => {
    if (!structureId) return false;

    const { error: updateError } = await supabase
      .from('patient_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('structure_id', structureId)
      .eq('direction', 'patient_to_practitioner')
      .eq('is_read', false);

    if (updateError) {
      console.error('Error marking conversation as read:', updateError);
      return false;
    }

    await fetchMessages();
    return true;
  };

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (structureLoading || !structureId) return;

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('practitioner-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_messages',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId, structureLoading, fetchMessages]);

  return {
    messages,
    conversations,
    unreadCount,
    loading: loading || structureLoading,
    error,
    sendReply,
    markAsRead,
    markConversationAsRead,
    refetch: fetchMessages,
  };
}
