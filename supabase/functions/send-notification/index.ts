import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  event_key: 'new_appointment' | 'cancel_appointment' | 'no_show' | 'urgent_alert' | 'daily_summary';
  structure_id: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface RecipientContact {
  email?: string;
  phone?: string;
  name: string;
}

const EVENT_LABELS: Record<string, string> = {
  new_appointment: 'Nouveau rendez-vous',
  cancel_appointment: 'Annulation de rendez-vous',
  no_show: 'Patient absent',
  urgent_alert: 'Alerte urgente',
  daily_summary: 'Résumé quotidien',
};

// Twilio SMS helper
async function sendTwilioSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio not configured' };
  }

  // Normalize phone number (ensure it starts with +)
  let normalizedPhone = to.replace(/\s/g, '');
  if (!normalizedPhone.startsWith('+')) {
    // Assume French number if no country code
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+33' + normalizedPhone.slice(1);
    } else {
      normalizedPhone = '+' + normalizedPhone;
    }
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio error:', errorData);
      return { success: false, error: errorData.message || 'Twilio API error' };
    }

    return { success: true };
  } catch (error) {
    console.error('Twilio request failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const twilioConfigured = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && Deno.env.get('TWILIO_PHONE_NUMBER'));

    if (!resendApiKey && !twilioConfigured) {
      console.error('Neither email nor SMS service configured');
      return new Response(
        JSON.stringify({ error: 'Notification services not configured', configured: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload
    const payload: NotificationPayload = await req.json();
    const { event_key, structure_id, subject, message, metadata } = payload;

    console.log('Processing notification:', { event_key, structure_id });

    // Get structure name for branding
    const { data: structure } = await supabase
      .from('structures')
      .select('name')
      .eq('id', structure_id)
      .single();

    const structureName = structure?.name || 'OmniSoin';
    const eventLabel = EVENT_LABELS[event_key] || event_key;

    // ============ EMAIL NOTIFICATIONS ============
    let emailsSent = 0;
    let emailsFailed = 0;

    if (resend) {
      // Fetch email recipients
      const { data: emailRecipients } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('structure_id', structure_id)
        .eq('event_key', event_key)
        .eq('channel', 'email')
        .eq('is_enabled', true);

      if (emailRecipients && emailRecipients.length > 0) {
        const emailsToSend = await resolveRecipientContacts(supabase, emailRecipients, structure_id, 'email');
        const uniqueEmails = deduplicateContacts(emailsToSend, 'email');

        console.log(`Sending emails to ${uniqueEmails.length} recipients`);

        for (const recipient of uniqueEmails) {
          if (!recipient.email) continue;
          
          const emailSubject = subject || `[${eventLabel}] Notification OmniSoin`;
          
          try {
            await resend.emails.send({
              from: `${structureName} <noreply@omnisoin.fr>`,
              to: [recipient.email],
              subject: emailSubject,
              html: generateEmailHtml({
                recipientName: recipient.name,
                structureName,
                eventLabel,
                subject,
                message,
                metadata,
              }),
            });
            
            emailsSent++;
            
            // Log success
            await supabase.from('notification_logs').insert({
              structure_id,
              event_type: event_key,
              channel: 'email',
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              subject: emailSubject,
              message,
              status: 'sent',
            });
          } catch (error) {
            emailsFailed++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Email failed to ${recipient.email}: ${errorMsg}`);
            
            // Log failure
            await supabase.from('notification_logs').insert({
              structure_id,
              event_type: event_key,
              channel: 'email',
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              subject: emailSubject,
              message,
              status: 'failed',
              error_message: errorMsg,
            });
          }
        }
        
        console.log(`Emails: ${emailsSent} sent, ${emailsFailed} failed`);
      }
    }

    // ============ SMS NOTIFICATIONS ============
    let smsSent = 0;
    let smsFailed = 0;

    if (twilioConfigured) {
      // Fetch SMS recipients
      const { data: smsRecipients } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('structure_id', structure_id)
        .eq('event_key', event_key)
        .eq('channel', 'sms')
        .eq('is_enabled', true);

      if (smsRecipients && smsRecipients.length > 0) {
        const smsContacts = await resolveRecipientContacts(supabase, smsRecipients, structure_id, 'sms');
        const uniquePhones = deduplicateContacts(smsContacts, 'phone');

        console.log(`Sending SMS to ${uniquePhones.length} recipients`);

        // Build SMS message (concise for SMS)
        const smsBody = `[${structureName}] ${eventLabel}\n${message}`.slice(0, 1600);

        for (const recipient of uniquePhones) {
          if (!recipient.phone) continue;
          
          const result = await sendTwilioSMS(recipient.phone, smsBody);
          if (result.success) {
            smsSent++;
            console.log(`SMS sent to ${recipient.phone}`);
            
            // Log success
            await supabase.from('notification_logs').insert({
              structure_id,
              event_type: event_key,
              channel: 'sms',
              recipient_phone: recipient.phone,
              recipient_name: recipient.name,
              message: smsBody,
              status: 'sent',
            });
          } else {
            smsFailed++;
            console.error(`SMS failed to ${recipient.phone}: ${result.error}`);
            
            // Log failure
            await supabase.from('notification_logs').insert({
              structure_id,
              event_type: event_key,
              channel: 'sms',
              recipient_phone: recipient.phone,
              recipient_name: recipient.name,
              message: smsBody,
              status: 'failed',
              error_message: result.error,
            });
          }
        }

        console.log(`SMS: ${smsSent} sent, ${smsFailed} failed`);
      }
    }

    // Log the notification event
    await supabase.from('activity_logs').insert({
      structure_id,
      actor_user_id: claimsData.claims.sub,
      action: 'NOTIFICATION_SENT',
      metadata: {
        event_key,
        email: { sent: emailsSent, failed: emailsFailed },
        sms: { sent: smsSent, failed: smsFailed },
        subject,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: emailsSent + smsSent,
        failed: emailsFailed + smsFailed,
        total: emailsSent + smsSent + emailsFailed + smsFailed,
        details: {
          email: { sent: emailsSent, failed: emailsFailed },
          sms: { sent: smsSent, failed: smsFailed },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveRecipientContacts(
  supabase: any,
  recipients: Array<{ target_type: string; target_id: string | null }>,
  structureId: string,
  channel: 'email' | 'sms'
): Promise<RecipientContact[]> {
  const contacts: RecipientContact[] = [];

  for (const recipient of recipients) {
    if (recipient.target_type === 'structure') {
      // Get all active users in the structure
      const { data: structureUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('structure_id', structureId)
        .eq('is_active', true);

      if (structureUsers) {
        for (const user of structureUsers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, phone, first_name, last_name')
            .eq('user_id', user.user_id)
            .single();

          if (profile) {
            contacts.push({
              email: channel === 'email' ? profile.email : undefined,
              phone: channel === 'sms' ? profile.phone : undefined,
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Utilisateur',
            });
          }
        }
      }
    } else if (recipient.target_type === 'team' && recipient.target_id) {
      // Get team members
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', recipient.target_id);

      if (teamMembers) {
        for (const member of teamMembers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, phone, first_name, last_name')
            .eq('user_id', member.user_id)
            .single();

          if (profile) {
            contacts.push({
              email: channel === 'email' ? profile.email : undefined,
              phone: channel === 'sms' ? profile.phone : undefined,
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Utilisateur',
            });
          }
        }
      }
    } else if (recipient.target_type === 'user' && recipient.target_id) {
      // Get specific user
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone, first_name, last_name')
        .eq('user_id', recipient.target_id)
        .single();

      if (profile) {
        contacts.push({
          email: channel === 'email' ? profile.email : undefined,
          phone: channel === 'sms' ? profile.phone : undefined,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Utilisateur',
        });
      }
    }
  }

  return contacts;
}

function deduplicateContacts(contacts: RecipientContact[], by: 'email' | 'phone'): RecipientContact[] {
  const seen = new Set<string>();
  return contacts.filter(contact => {
    const value = by === 'email' ? contact.email : contact.phone;
    if (!value || seen.has(value.toLowerCase())) return false;
    seen.add(value.toLowerCase());
    return true;
  });
}

interface EmailTemplateParams {
  recipientName: string;
  structureName: string;
  eventLabel: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

function generateEmailHtml(params: EmailTemplateParams): string {
  const { recipientName, structureName, eventLabel, subject, message, metadata } = params;

  const metadataHtml = metadata
    ? Object.entries(metadata)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `<p style="margin: 4px 0; color: #6b7280;"><strong>${key}:</strong> ${value}</p>`)
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${structureName}</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${eventLabel}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Bonjour <strong>${recipientName}</strong>,</p>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">${subject}</h2>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">${message}</p>
              </div>
              
              ${metadataHtml ? `
              <div style="margin-top: 24px; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Détails</h3>
                ${metadataHtml}
              </div>
              ` : ''}
              
              <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px;">
                — L'équipe ${structureName}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Cet email a été envoyé automatiquement par OmniSoin.<br>
                © ${new Date().getFullYear()} OmniSoin - Tous droits réservés
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
