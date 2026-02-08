import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

// Types for patient portal
export interface PatientAccount {
  id: string;
  patient_id: string;
  email: string;
  access_code: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export interface PatientMessage {
  id: string;
  patient_id: string;
  practitioner_id: string | null;
  practitioner_name: string; // Computed field, not from DB
  subject: string | null;
  content: string;
  is_read: boolean;
  direction: string;
  created_at: string;
  read_at: string | null;
  structure_id: string | null;
}

export interface PatientDocument {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  file_url: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
  structure_id: string | null;
}

export interface PatientAppointment {
  id: string;
  patient_id: string;
  practitioner_id: string | null;
  practitioner_name: string;
  start_time: string;
  end_time: string;
  title: string | null;
  appointment_type: string | null;
  status: string | null;
  location: string | null;
  notes: string | null;
}

export interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  sex: string | null;
}

// Verify patient access and return session data
export async function verifyPatientAccess(email: string, accessCode: string): Promise<{
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
} | null> {
  const { data, error } = await supabase.rpc('verify_patient_access', {
    _email: email,
    _access_code: accessCode.toUpperCase(),
  });

  if (error || !data || data.length === 0) {
    console.error('Patient verification failed:', error);
    return null;
  }

  const patient = data[0];
  return {
    patientId: patient.patient_id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    email: patient.email,
  };
}

// Get patient messages with practitioner names
export async function getPatientMessages(patientId: string): Promise<PatientMessage[]> {
  // First get messages
  const { data: messages, error } = await supabase
    .from('patient_messages')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient messages:', error);
    return [];
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Get unique practitioner IDs (team_member IDs)
  const practitionerIds = [...new Set(
    messages
      .filter(m => m.practitioner_id)
      .map(m => m.practitioner_id)
  )];

  // Fetch practitioner names from team_members with profiles join
  let practitionerNames: Record<string, string> = {};
  
  if (practitionerIds.length > 0) {
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('id, user_id, profiles!team_members_user_id_fkey(first_name, last_name)')
      .in('id', practitionerIds);

    if (!teamError && teamMembers) {
      practitionerNames = teamMembers.reduce((acc, tm: any) => {
        const profile = tm.profiles;
        if (profile) {
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          acc[tm.id] = fullName || 'Praticien';
        } else {
          acc[tm.id] = 'Praticien';
        }
        return acc;
      }, {} as Record<string, string>);
    }
  }

  return messages.map((msg) => ({
    id: msg.id,
    patient_id: msg.patient_id,
    practitioner_id: msg.practitioner_id,
    practitioner_name: msg.practitioner_id 
      ? (practitionerNames[msg.practitioner_id] || 'Praticien')
      : 'Secrétariat',
    subject: msg.subject,
    content: msg.content,
    is_read: msg.is_read ?? false,
    direction: msg.direction,
    created_at: msg.created_at,
    read_at: msg.read_at,
    structure_id: msg.structure_id,
  }));
}

// Send patient message
export async function sendPatientMessage(
  patientId: string,
  subject: string,
  content: string,
  structureId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('send_patient_message', {
    _patient_id: patientId,
    _subject: subject,
    _content: content,
    _structure_id: structureId,
  });

  if (error) {
    console.error('Error sending patient message:', error);
    return null;
  }

  return data;
}

// Mark message as read
export async function markPatientMessageAsRead(messageId: string): Promise<boolean> {
  // This is a direct update - patient messages table has proper RLS for this
  // Since we're using security definer functions, we need to update via function or edge function
  // For now, we'll rely on the practitioner side to mark as read
  return true;
}

// Get patient documents
export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const { data, error } = await supabase
    .from('patient_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient documents:', error);
    return [];
  }

  return (data || []).map((doc) => ({
    id: doc.id,
    patient_id: doc.patient_id,
    title: doc.title,
    description: doc.description,
    type: doc.type,
    category: doc.category,
    file_url: doc.file_url,
    file_size: doc.file_size,
    uploaded_by_name: doc.uploaded_by_name,
    created_at: doc.created_at,
    structure_id: doc.structure_id,
  }));
}

// Get patient appointments with practitioner names
export async function getPatientAppointments(patientId: string): Promise<PatientAppointment[]> {
  // First get appointments
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching patient appointments:', error);
    return [];
  }

  if (!appointments || appointments.length === 0) {
    return [];
  }

  // Get unique practitioner IDs (team_member IDs)
  const practitionerIds = [...new Set(
    appointments
      .filter(apt => apt.practitioner_id)
      .map(apt => apt.practitioner_id)
  )];

  // Fetch practitioner names from team_members with profiles join
  let practitionerNames: Record<string, string> = {};
  
  if (practitionerIds.length > 0) {
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('id, user_id, profiles!team_members_user_id_fkey(first_name, last_name)')
      .in('id', practitionerIds);

    if (!teamError && teamMembers) {
      practitionerNames = teamMembers.reduce((acc, tm: any) => {
        const profile = tm.profiles;
        if (profile) {
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          acc[tm.id] = fullName || 'Praticien';
        } else {
          acc[tm.id] = 'Praticien';
        }
        return acc;
      }, {} as Record<string, string>);
    }
  }

  return appointments.map((apt) => ({
    id: apt.id,
    patient_id: apt.patient_id || patientId,
    practitioner_id: apt.practitioner_id,
    practitioner_name: apt.practitioner_id 
      ? (practitionerNames[apt.practitioner_id] || 'Praticien')
      : 'Praticien',
    start_time: apt.start_time,
    end_time: apt.end_time,
    title: apt.title,
    appointment_type: apt.appointment_type,
    status: apt.status,
    location: apt.location,
    notes: apt.notes,
  }));
}

// Get patient info
export async function getPatientInfo(patientId: string): Promise<PatientInfo | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, first_name, last_name, email, phone, dob, sex')
    .eq('id', patientId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching patient info:', error);
    return null;
  }

  return {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || '',
    phone: data.phone,
    dob: data.dob,
    sex: data.sex,
  };
}

// Get practitioners for appointment booking (public info only)
export async function getAvailablePractitioners(structureId: string): Promise<{
  id: string;
  name: string;
  specialty: string;
}[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, user_id, job_title, specialty, profiles!team_members_user_id_fkey(first_name, last_name)')
    .eq('structure_id', structureId)
    .eq('is_available', true);

  if (error) {
    console.error('Error fetching practitioners:', error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() || 'Praticien' : 'Praticien',
    specialty: p.job_title || p.specialty || 'Médecin',
  }));
}

// Get consultation reasons
export async function getConsultationReasons(structureId: string): Promise<{
  id: string;
  label: string;
  duration: number;
}[]> {
  const { data, error } = await supabase
    .from('consultation_reasons')
    .select('id, label, default_duration')
    .eq('structure_id', structureId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching consultation reasons:', error);
    return [];
  }

  return (data || []).map((r) => ({
    id: r.id,
    label: r.label,
    duration: r.default_duration || 20,
  }));
}

// Get patient structure ID
export async function getPatientStructureId(patientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('structure_id')
    .eq('id', patientId)
    .single();

  if (error || !data) {
    console.error('Error fetching patient structure:', error);
    return null;
  }

  return data.structure_id;
}

// Group messages into conversations
export function groupMessagesIntoConversations(messages: PatientMessage[]): {
  id: string;
  practitioner: string;
  practitionerRole: string;
  lastMessage: string;
  lastMessageDate: Date;
  unreadCount: number;
  messages: PatientMessage[];
}[] {
  const conversationMap = new Map<string, PatientMessage[]>();

  // Group by practitioner_id or 'secretariat' for system messages
  messages.forEach((msg) => {
    const key = msg.practitioner_id || 'secretariat';
    if (!conversationMap.has(key)) {
      conversationMap.set(key, []);
    }
    conversationMap.get(key)!.push(msg);
  });

  return Array.from(conversationMap.entries()).map(([key, msgs]) => {
    const sorted = msgs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastMsg = sorted[0];
    const unread = msgs.filter(m => !m.is_read && m.direction === 'practitioner_to_patient').length;

    return {
      id: key,
      practitioner: lastMsg.practitioner_name,
      practitionerRole: 'Équipe médicale',
      lastMessage: lastMsg.content,
      lastMessageDate: new Date(lastMsg.created_at),
      unreadCount: unread,
      messages: sorted.reverse(), // Oldest first for display
    };
  }).sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
}
