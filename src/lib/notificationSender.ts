import { supabase } from '@/integrations/supabase/client';
import { EventKey } from '@/lib/teams';

export interface SendNotificationParams {
  eventKey: EventKey;
  structureId: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  error?: string;
  details?: {
    email?: { sent: number; failed: number };
    sms?: { sent: number; failed: number };
  };
}

/**
 * Sends email notifications to configured recipients for a given event.
 * Uses the send-notification Edge Function which queries notification_recipients
 * and resolves team/user emails automatically.
 */
export async function sendEventNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const { eventKey, structureId, subject, message, metadata } = params;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('User not authenticated');
    }

    const response = await supabase.functions.invoke('send-notification', {
      body: {
        event_key: eventKey,
        structure_id: structureId,
        subject,
        message,
        metadata,
      },
    });

    if (response.error) {
      console.error('Error invoking send-notification:', response.error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        total: 0,
        error: response.error.message,
      };
    }

    return response.data as SendNotificationResult;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convenience functions for common notification events
 */
export const NotificationEvents = {
  /**
   * Notify about a new appointment
   */
  async newAppointment(
    structureId: string,
    patientName: string,
    practitionerName: string,
    dateTime: string,
    reason?: string
  ): Promise<SendNotificationResult> {
    return sendEventNotification({
      eventKey: 'new_appointment',
      structureId,
      subject: `Nouveau RDV: ${patientName}`,
      message: `Un nouveau rendez-vous a été pris pour ${patientName} avec ${practitionerName} le ${dateTime}.`,
      metadata: {
        patient: patientName,
        practitioner: practitionerName,
        date: dateTime,
        motif: reason,
      },
    });
  },

  /**
   * Notify about a cancelled appointment
   */
  async cancelAppointment(
    structureId: string,
    patientName: string,
    practitionerName: string,
    dateTime: string,
    reason?: string
  ): Promise<SendNotificationResult> {
    return sendEventNotification({
      eventKey: 'cancel_appointment',
      structureId,
      subject: `RDV annulé: ${patientName}`,
      message: `Le rendez-vous de ${patientName} avec ${practitionerName} prévu le ${dateTime} a été annulé.${reason ? ` Raison: ${reason}` : ''}`,
      metadata: {
        patient: patientName,
        practitioner: practitionerName,
        date: dateTime,
        raison: reason,
      },
    });
  },

  /**
   * Notify about a no-show
   */
  async noShow(
    structureId: string,
    patientName: string,
    practitionerName: string,
    dateTime: string
  ): Promise<SendNotificationResult> {
    return sendEventNotification({
      eventKey: 'no_show',
      structureId,
      subject: `Patient absent: ${patientName}`,
      message: `${patientName} ne s'est pas présenté au rendez-vous prévu avec ${practitionerName} le ${dateTime}.`,
      metadata: {
        patient: patientName,
        practitioner: practitionerName,
        date: dateTime,
      },
    });
  },

  /**
   * Send an urgent alert
   */
  async urgentAlert(
    structureId: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<SendNotificationResult> {
    return sendEventNotification({
      eventKey: 'urgent_alert',
      structureId,
      subject: `🚨 URGENT: ${title}`,
      message,
      metadata,
    });
  },

  /**
   * Send daily summary
   */
  async dailySummary(
    structureId: string,
    date: string,
    stats: {
      appointmentsTotal: number;
      appointmentsCompleted: number;
      noShows: number;
      newPatients: number;
    }
  ): Promise<SendNotificationResult> {
    const completionRate = stats.appointmentsTotal > 0
      ? Math.round((stats.appointmentsCompleted / stats.appointmentsTotal) * 100)
      : 0;

    return sendEventNotification({
      eventKey: 'daily_summary',
      structureId,
      subject: `Résumé du ${date}`,
      message: `Voici le résumé de l'activité du ${date}: ${stats.appointmentsCompleted}/${stats.appointmentsTotal} RDV effectués (${completionRate}%), ${stats.noShows} absences, ${stats.newPatients} nouveaux patients.`,
      metadata: {
        'RDV prévus': stats.appointmentsTotal,
        'RDV effectués': stats.appointmentsCompleted,
        'Absences': stats.noShows,
        'Nouveaux patients': stats.newPatients,
        'Taux de complétion': `${completionRate}%`,
      },
    });
  },
};

/**
 * Test the notification system by sending a test email
 */
export async function testNotificationSystem(
  structureId: string,
  eventKey: EventKey = 'new_appointment'
): Promise<SendNotificationResult> {
  return sendEventNotification({
    eventKey,
    structureId,
    subject: 'Test de notification OmniSoin',
    message: 'Ceci est un test du système de notifications. Si vous recevez cet email, la configuration est correcte.',
    metadata: {
      test: true,
      timestamp: new Date().toISOString(),
    },
  });
}
