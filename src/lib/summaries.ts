import { supabase } from '@/integrations/supabase/client';
import { logActivity } from './activity';

export type SummaryStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface TranscriptSummary {
  id: string;
  transcript_id: string;
  structure_id: string | null;
  patient_id: string | null;
  generated_by: string | null;
  summary_text: string | null;
  model_used: string | null;
  status: SummaryStatus;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  started_at: string | null;
  latency_ms: number | null;
  created_at: string;
}

/**
 * Payload sent to n8n for summary generation
 */
export interface SummaryRequestPayload {
  type: 'summary_request';
  summary_id: string;
  structure_id: string;
  transcript_id: string;
  patient_id: string;
  requested_by: string;
  requested_at: string;
  lang: 'fr';
  options: {
    format: 'markdown';
    max_tokens: number;
  };
}

/**
 * Check if the n8n summary webhook is configured
 * Note: Since we now use an edge function, webhook is always "configured"
 * The edge function reads secrets server-side
 */
export function isWebhookConfigured(): boolean {
  // Always return true since we use an edge function that reads secrets server-side
  return true;
}

/**
 * Fetch summary by transcript ID
 */
export async function fetchSummaryByTranscriptId(
  transcriptId: string
): Promise<TranscriptSummary | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transcript_summaries')
    .select('*')
    .eq('transcript_id', transcriptId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching summary:', error);
    return null;
  }

  return data as TranscriptSummary | null;
}

/**
 * Calculate if a summary is stuck (generating for more than X minutes)
 */
export function isSummaryStuck(summary: TranscriptSummary, thresholdMinutes = 5): boolean {
  if (summary.status !== 'generating' || !summary.started_at) {
    return false;
  }
  const startedAt = new Date(summary.started_at);
  const now = new Date();
  const diffMs = now.getTime() - startedAt.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes > thresholdMinutes;
}

/**
 * Get minutes elapsed since summary started generating
 */
export function getMinutesSinceStart(summary: TranscriptSummary): number {
  if (!summary.started_at) return 0;
  const startedAt = new Date(summary.started_at);
  const now = new Date();
  const diffMs = now.getTime() - startedAt.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Create a summary request (status = 'pending') and trigger n8n webhook synchronously.
 * Uses UPSERT to ensure idempotent summary_id (one summary per transcript).
 * Waits for the edge function response (which waits for n8n) before returning.
 */
export async function createSummaryRequest(
  transcriptId: string,
  structureId: string,
  patientId: string,
  userId: string
): Promise<TranscriptSummary> {
  const now = new Date().toISOString();

  // 1. Upsert summary with status='pending' and started_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transcript_summaries')
    .upsert(
      {
        transcript_id: transcriptId,
        structure_id: structureId,
        patient_id: patientId,
        generated_by: userId,
        status: 'pending',
        started_at: now,
        summary_text: null,
        error_message: null,
        error_details: null,
        latency_ms: null,
        model_used: null,
      },
      { onConflict: 'transcript_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error creating summary request:', error);
    throw new Error('Impossible de créer la demande de résumé');
  }

  const summary = data as TranscriptSummary;

  // 2. Log activity
  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'TRANSCRIPT_SUMMARY_REQUESTED',
    patientId,
    metadata: {
      transcript_id: transcriptId,
      summary_id: summary.id,
    },
  });

  // 3. Build enriched payload and call edge function SYNCHRONOUSLY
  const payload: SummaryRequestPayload = {
    type: 'summary_request',
    summary_id: summary.id,
    structure_id: structureId,
    transcript_id: transcriptId,
    patient_id: patientId,
    requested_by: userId,
    requested_at: now,
    lang: 'fr',
    options: {
      format: 'markdown',
      max_tokens: 900,
    },
  };

  // Call edge function and WAIT for response (synchronous mode)
  const edgeResult = await triggerN8nSummaryWebhook(payload);
  
  if (!edgeResult.success) {
    console.warn('Edge function call failed:', edgeResult.error);
    // Return the pending summary - user can retry
    return summary;
  }

  // 4. After edge function returns, fetch the updated summary from DB
  const updatedSummary = await fetchSummaryByTranscriptId(transcriptId);
  return updatedSummary || summary;
}

interface EdgeFunctionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Trigger n8n summary webhook via Edge Function (synchronous).
 * The edge function reads secrets server-side and calls n8n,
 * WAITING for n8n to complete before returning.
 */
export async function triggerN8nSummaryWebhook(
  payload: SummaryRequestPayload
): Promise<EdgeFunctionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('trigger-summary', {
      body: payload,
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      console.error('Trigger summary failed:', data?.error);
      return { success: false, error: data?.error || 'Unknown error' };
    }

    console.log('Summary webhook completed successfully:', data);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error calling trigger-summary edge function:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update summary status (used by n8n or for manual updates)
 */
export async function updateSummaryStatus(
  summaryId: string,
  status: SummaryStatus,
  summaryText?: string | null,
  modelUsed?: string | null,
  errorMessage?: string | null
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (summaryText !== undefined) {
    updateData.summary_text = summaryText;
  }
  if (modelUsed !== undefined) {
    updateData.model_used = modelUsed;
  }
  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('transcript_summaries')
    .update(updateData)
    .eq('id', summaryId);

  if (error) {
    console.error('Error updating summary status:', error);
    throw new Error('Impossible de mettre à jour le résumé');
  }
}
