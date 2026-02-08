import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  structure_id: string;
  structure_name: string;
  inviter_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role, structure_id, structure_name, inviter_name }: InvitationRequest = await req.json();

    // Validate required fields
    if (!email || !role || !structure_id || !structure_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .eq("email", email)
      .maybeSingle();

    let userId: string | null = null;
    let isNewUser = true;

    if (existingProfile) {
      userId = existingProfile.user_id;
      isNewUser = false;

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("org_members")
        .select("id, is_active")
        .eq("structure_id", structure_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        if (existingMember.is_active) {
          return new Response(
            JSON.stringify({ error: "Cet utilisateur est déjà membre de la structure" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: "Une invitation est déjà en attente pour cet utilisateur" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Create pending membership for existing user
      const { error: memberError } = await supabase
        .from("org_members")
        .insert({
          structure_id,
          user_id: userId,
          org_role: role,
          is_active: false,
          accepted_at: null,
        });

      if (memberError) {
        console.error("Error creating membership:", memberError);
        throw memberError;
      }
    }

    // Generate invitation link
    const baseUrl = Deno.env.get("SITE_URL") || "https://omnisoin.lovable.app";
    const inviteLink = isNewUser 
      ? `${baseUrl}/auth?invite=true&structure=${structure_id}&role=${role}&email=${encodeURIComponent(email)}`
      : `${baseUrl}/auth?action=join&structure=${structure_id}`;

    // Role labels in French
    const roleLabels: Record<string, string> = {
      owner: "Propriétaire",
      admin: "Administrateur",
      coordinator: "Coordinatrice",
      doctor: "Médecin",
      ipa: "IPA",
      nurse: "Infirmier(e)",
      assistant: "Assistante",
      viewer: "Lecteur",
    };

    const roleLabel = roleLabels[role] || role;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: `${structure_name} <noreply@omnisoin.fr>`,
      to: [email],
      subject: `Invitation à rejoindre ${structure_name} sur OmniSoin`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation OmniSoin</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">OmniSoin</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Invitation à rejoindre une structure</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Bonjour,</p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">
                <strong>${inviter_name || "Un administrateur"}</strong> vous invite à rejoindre 
                <strong>${structure_name}</strong> sur OmniSoin en tant que <strong>${roleLabel}</strong>.
              </p>
              
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                ${isNewUser 
                  ? "Cliquez sur le bouton ci-dessous pour créer votre compte et rejoindre la structure."
                  : "Cliquez sur le bouton ci-dessous pour accepter l'invitation et rejoindre la structure."
                }
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${inviteLink}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      ${isNewUser ? "Créer mon compte" : "Accepter l'invitation"}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 12px;">
                Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} OmniSoin. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser,
        message: `Invitation envoyée à ${email}` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-member-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur lors de l'envoi de l'invitation" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
