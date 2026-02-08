import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activity';

export type TranscriptSource = 'mic' | 'upload' | 'whatsapp' | 'phone';
export type TranscriptStatus = 'uploaded' | 'transcribing' | 'ready' | 'failed';

export interface PatientTranscript {
  id: string;
  structure_id: string;
  patient_id: string;
  source: TranscriptSource;
  status: TranscriptStatus;
  audio_path: string | null;
  duration_seconds: number | null;
  language: string | null;
  transcript_text: string | null;
  created_by: string | null;
  created_at: string;
  validated_by: string | null;
  validated_at: string | null;
  // Joined patient data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };
}

export interface TranscriptFilters {
  status?: TranscriptStatus | 'all';
  patientSearch?: string;
}

export async function fetchTranscripts(
  filters: TranscriptFilters = {}
): Promise<PatientTranscript[]> {
  // RLS handles structure filtering via can_access_patient
  let query = supabase
    .from('patient_transcripts')
    .select(`
      *,
      patient:patients!patient_id (
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any as PatientTranscript[];
}

export async function fetchTranscriptById(transcriptId: string): Promise<PatientTranscript | null> {
  const { data, error } = await supabase
    .from('patient_transcripts')
    .select(`
      *,
      patient:patients!patient_id (
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .eq('id', transcriptId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any as PatientTranscript;
}

export async function fetchTranscriptsByPatient(patientId: string): Promise<PatientTranscript[]> {
  const { data, error } = await supabase
    .from('patient_transcripts')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any as PatientTranscript[];
}

export async function uploadTranscriptAudio(
  file: File,
  structureId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${structureId}/${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('transcripts-audio')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return fileName;
}

export async function getAudioSignedUrl(audioPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('transcripts-audio')
    .createSignedUrl(audioPath, 3600); // 1 hour

  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

export async function createTranscript(
  structureId: string,
  patientId: string,
  audioPath: string,
  userId: string,
  source: TranscriptSource = 'upload',
  durationSeconds?: number
): Promise<PatientTranscript> {
  const { data, error } = await supabase
    .from('patient_transcripts')
    .insert({
      structure_id: structureId,
      patient_id: patientId,
      audio_path: audioPath,
      source,
      status: 'uploaded',
      created_by: userId,
      ...(durationSeconds !== undefined && durationSeconds > 0 && { duration_seconds: durationSeconds }),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log activity
  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'TRANSCRIPT_UPLOADED',
    patientId,
    metadata: { transcript_id: data.id },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any as PatientTranscript;
}

export async function updateTranscriptStatus(
  transcriptId: string,
  status: TranscriptStatus,
  structureId: string,
  userId: string,
  patientId: string,
  transcriptText?: string
): Promise<void> {
  const updateData: Record<string, unknown> = { status };
  if (transcriptText !== undefined) {
    updateData.transcript_text = transcriptText;
  }

  const { error } = await supabase
    .from('patient_transcripts')
    .update(updateData)
    .eq('id', transcriptId);

  if (error) {
    throw error;
  }

  // Log activity based on status
  let action: string | null = null;
  if (status === 'transcribing') {
    action = 'TRANSCRIPTION_REQUESTED';
  } else if (status === 'ready') {
    action = 'TRANSCRIPTION_READY';
  } else if (status === 'failed') {
    action = 'TRANSCRIPTION_FAILED';
  }

  if (action) {
    await logActivity({
      structureId,
      actorUserId: userId,
      action: action as 'TRANSCRIPTION_REQUESTED' | 'TRANSCRIPTION_READY' | 'TRANSCRIPTION_FAILED',
      patientId,
      metadata: { transcript_id: transcriptId },
    });
  }
}

export async function updateTranscriptLanguage(
  transcriptId: string,
  language: string,
  structureId: string,
  userId: string,
  patientId: string,
  oldLanguage?: string | null
): Promise<void> {
  const { error } = await supabase
    .from('patient_transcripts')
    .update({ language })
    .eq('id', transcriptId);

  if (error) {
    // Don't throw - RLS might block, just log
    console.warn('Could not update transcript language:', error);
    return;
  }

  // Log activity
  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'TRANSCRIPTION_LANGUAGE_SET',
    patientId,
    metadata: { 
      transcript_id: transcriptId,
      old_language: oldLanguage || null,
      new_language: language,
    },
  });
}

export async function validateTranscript(
  transcriptId: string,
  structureId: string,
  userId: string,
  patientId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('patient_transcripts')
    .update({
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq('id', transcriptId);

  if (error) {
    console.error('Failed to validate transcript:', error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'TRANSCRIPT_VALIDATED',
    patientId,
    metadata: { transcript_id: transcriptId },
  });

  return { success: true };
}

export async function revokeTranscriptValidation(
  transcriptId: string,
  structureId: string,
  userId: string,
  patientId: string,
  reason: string,
  originalValidatedBy?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim().length < 10) {
    return { success: false, error: 'Le motif de révocation doit contenir au moins 10 caractères' };
  }

  const { error } = await supabase
    .from('patient_transcripts')
    .update({
      validated_by: null,
      validated_at: null,
    })
    .eq('id', transcriptId);

  if (error) {
    console.error('Failed to revoke transcript validation:', error);
    return { success: false, error: error.message };
  }

  // Log activity with complete traceability
  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'TRANSCRIPT_VALIDATION_REVOKED',
    patientId,
    metadata: { 
      transcript_id: transcriptId,
      revocation_reason: reason.trim(),
      original_validated_by: originalValidatedBy || null,
      revoked_at: new Date().toISOString(),
    },
  });

  return { success: true };
}
