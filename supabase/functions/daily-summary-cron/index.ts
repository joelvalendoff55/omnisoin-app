import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface StructureStats {
  structure_id: string;
  structure_name: string;
  appointments_total: number;
  appointments_completed: number;
  no_shows: number;
  new_patients: number;
}

interface RecipientEmail {
  email: string;
  name?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to access all structures
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[daily-summary-cron] Starting daily summary generation...');

    // Get today's date in France timezone
    const now = new Date();
    const franceTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const todayStr = franceTime.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calculate today's date range
    const todayStart = new Date(franceTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(franceTime);
    todayEnd.setHours(23, 59, 59, 999);

    // Get all active structures
    const { data: structures, error: structuresError } = await supabase
      .from('structures')
      .select('id, name')
      .eq('is_active', true);

    if (structuresError) {
      throw new Error(`Failed to fetch structures: ${structuresError.message}`);
    }

    console.log(`[daily-summary-cron] Processing ${structures?.length || 0} structures`);

    const results: { structure_id: string; success: boolean; sent: number; error?: string }[] = [];

    for (const structure of structures || []) {
      try {
        // Check if daily_summary is enabled for this structure
        const { data: recipients } = await supabase
          .from('notification_recipients')
          .select('*')
          .eq('structure_id', structure.id)
          .eq('event_key', 'daily_summary')
          .eq('is_enabled', true);

        if (!recipients || recipients.length === 0) {
          console.log(`[daily-summary-cron] Skipping structure ${structure.name}: no recipients configured or disabled`);
          results.push({ structure_id: structure.id, success: true, sent: 0 });
          continue;
        }

        // Gather stats for this structure
        const stats = await gatherStructureStats(supabase, structure.id, todayStart, todayEnd);
        
        // Resolve recipient emails
        const emails = await resolveRecipientEmails(supabase, recipients, structure.id);
        
        if (emails.length === 0) {
          console.log(`[daily-summary-cron] No valid emails found for structure ${structure.name}`);
          results.push({ structure_id: structure.id, success: true, sent: 0 });
          continue;
        }

        // Calculate completion rate
        const completionRate = stats.appointments_total > 0
          ? Math.round((stats.appointments_completed / stats.appointments_total) * 100)
          : 0;

        // Send email to all recipients
        const subject = `📊 Résumé du ${todayStr} - ${structure.name}`;
        const htmlContent = generateSummaryHtml(structure.name, todayStr, stats, completionRate);

        let sentCount = 0;
        for (const recipient of emails) {
          try {
            await resend.emails.send({
              from: 'OmniSoin <notifications@omnisoin.lovable.app>',
              to: [recipient.email],
              subject,
              html: htmlContent,
            });
            sentCount++;
            console.log(`[daily-summary-cron] Sent to ${recipient.email} for ${structure.name}`);
          } catch (emailError) {
            console.error(`[daily-summary-cron] Failed to send to ${recipient.email}:`, emailError);
          }
        }

        // Log the activity
        await supabase.from('activity_logs').insert({
          structure_id: structure.id,
          actor_user_id: '00000000-0000-0000-0000-000000000000', // System user
          action: 'daily_summary_sent',
          metadata: {
            date: todayStr,
            recipients_count: sentCount,
            stats,
            completion_rate: `${completionRate}%`,
          },
        });

        results.push({ structure_id: structure.id, success: true, sent: sentCount });
        console.log(`[daily-summary-cron] Structure ${structure.name}: sent to ${sentCount} recipients`);
      } catch (structureError) {
        console.error(`[daily-summary-cron] Error processing structure ${structure.name}:`, structureError);
        results.push({ 
          structure_id: structure.id, 
          success: false, 
          sent: 0, 
          error: structureError instanceof Error ? structureError.message : 'Unknown error' 
        });
      }
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    console.log(`[daily-summary-cron] Completed. Total emails sent: ${totalSent}`);

    return new Response(JSON.stringify({
      success: true,
      date: todayStr,
      structures_processed: structures?.length || 0,
      total_emails_sent: totalSent,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[daily-summary-cron] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherStructureStats(
  supabase: any,
  structureId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<StructureStats> {
  // Get appointments for today
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('structure_id', structureId)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString());

  const appointmentsTotal = appointments?.length || 0;
  const appointmentsCompleted = appointments?.filter((a: { status: string }) => a.status === 'completed').length || 0;

  // Get no-shows from patient_queue
  const { data: queueEntries } = await supabase
    .from('patient_queue')
    .select('id, status')
    .eq('structure_id', structureId)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString());

  const noShows = queueEntries?.filter((q: { status: string }) => q.status === 'no_show').length || 0;

  // Get new patients created today
  const { data: newPatients } = await supabase
    .from('patients')
    .select('id')
    .eq('structure_id', structureId)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString());

  return {
    structure_id: structureId,
    structure_name: '',
    appointments_total: appointmentsTotal,
    appointments_completed: appointmentsCompleted,
    no_shows: noShows,
    new_patients: newPatients?.length || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveRecipientEmails(
  supabase: any,
  recipients: Array<{ target_type: string; target_id: string }>,
  structureId: string
): Promise<RecipientEmail[]> {
  const emailsSet = new Set<string>();
  const result: RecipientEmail[] = [];

  for (const recipient of recipients) {
    if (recipient.target_type === 'structure') {
      // Get all active members of the structure
      const { data: members } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('structure_id', structureId)
        .eq('is_active', true);

      if (members) {
        for (const member of members) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('user_id', member.user_id)
            .single();

          if (profile?.email && !emailsSet.has(profile.email)) {
            emailsSet.add(profile.email);
            result.push({
              email: profile.email,
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined,
            });
          }
        }
      }
    } else if (recipient.target_type === 'team') {
      // Get all members of the team
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', recipient.target_id);

      if (teamMembers) {
        for (const member of teamMembers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('user_id', member.user_id)
            .single();

          if (profile?.email && !emailsSet.has(profile.email)) {
            emailsSet.add(profile.email);
            result.push({
              email: profile.email,
              name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined,
            });
          }
        }
      }
    } else if (recipient.target_type === 'user') {
      // Get specific user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_id', recipient.target_id)
        .single();

      if (profile?.email && !emailsSet.has(profile.email)) {
        emailsSet.add(profile.email);
        result.push({
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined,
        });
      }
    }
  }

  return result;
}

function generateSummaryHtml(
  structureName: string,
  dateStr: string,
  stats: StructureStats,
  completionRate: number
): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="padding: 40px 30px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              📊 Résumé Quotidien
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">
              ${structureName}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px; line-height: 1.6;">
              Bonjour,<br><br>
              Voici le résumé de l'activité du <strong>${dateStr}</strong> :
            </p>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
              <tr>
                <td style="padding: 15px; background-color: #f0fdf4; border-radius: 8px; text-align: center; width: 50%;">
                  <div style="font-size: 32px; font-weight: 700; color: #16a34a;">${stats.appointments_completed}</div>
                  <div style="font-size: 12px; color: #166534; margin-top: 5px;">RDV effectués</div>
                </td>
                <td style="width: 10px;"></td>
                <td style="padding: 15px; background-color: #eff6ff; border-radius: 8px; text-align: center; width: 50%;">
                  <div style="font-size: 32px; font-weight: 700; color: #2563eb;">${stats.appointments_total}</div>
                  <div style="font-size: 12px; color: #1e40af; margin-top: 5px;">RDV prévus</div>
                </td>
              </tr>
            </table>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
              <tr>
                <td style="padding: 15px; background-color: #fef2f2; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${stats.no_shows}</div>
                  <div style="font-size: 11px; color: #991b1b; margin-top: 5px;">Absences</div>
                </td>
                <td style="width: 10px;"></td>
                <td style="padding: 15px; background-color: #faf5ff; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${stats.new_patients}</div>
                  <div style="font-size: 11px; color: #5b21b6; margin-top: 5px;">Nouveaux patients</div>
                </td>
                <td style="width: 10px;"></td>
                <td style="padding: 15px; background-color: #f0f9ff; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="font-size: 24px; font-weight: 700; color: #0284c7;">${completionRate}%</div>
                  <div style="font-size: 11px; color: #075985; margin-top: 5px;">Taux complétion</div>
                </td>
              </tr>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ce résumé est généré automatiquement par OmniSoin chaque soir. 
                Vous pouvez modifier les préférences de notification dans les paramètres de votre structure.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              © ${new Date().getFullYear()} OmniSoin - Plateforme MSP
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
