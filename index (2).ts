// supabase/functions/send-confirmation/index.ts
// Triggered by the public portal after a successful request submission.
// Sends the requestor their control number and request details.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── TO SWITCH TO RESEND LATER ──────────────────────────────────────────────
// 1. npm install resend
// 2. Replace the sendEmail() function below with:
//    import { Resend } from "npm:resend";
//    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
//    await resend.emails.send({ from, to, subject, html });
// ──────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send email via Supabase's built-in SMTP (Auth > SMTP Settings in dashboard)
async function sendEmail(sb: any, to: string, subject: string, html: string) {
  const { error } = await sb.auth.admin.sendRawEmail({
    to,
    subject,
    html,
  });
  if (error) throw error;
}

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────

function templateEN(req: any): { subject: string; html: string } {
  return {
    subject: `OMCR Request Confirmed — ${req.id}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,60,0.10);">
        <!-- Header -->
        <tr><td style="background:#0d1f3c;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e8c96a;font-weight:600;">OFFICE OF THE MUNICIPAL CIVIL REGISTRAR</p>
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">Document Request Confirmed</h1>
        </td></tr>
        <!-- Control Number -->
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#7a6e5f;">YOUR REQUEST CONTROL NUMBER</p>
          <div style="display:inline-block;background:#f9f2de;border:2px dashed #c8962a;border-radius:10px;padding:16px 36px;font-family:'Courier New',monospace;font-size:26px;font-weight:700;color:#0d1f3c;letter-spacing:3px;">${req.id}</div>
          <p style="margin:16px 0 0;font-size:13px;color:#7a6e5f;">Keep this number. You will need it to track and claim your document.</p>
        </td></tr>
        <!-- Details -->
        <tr><td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8dc;border-radius:8px;overflow:hidden;">
            <tr style="background:#f7f5f0;"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7a6e5f;">Request Details</td></tr>
            ${row('Full Name', req.name)}
            ${row('Document Requested', req.doctype)}
            ${row('Number of Copies', req.copies)}
            ${row('Purpose', req.purpose)}
            ${row('Date Filed', new Date(req.created_at).toLocaleDateString('en-PH', {weekday:'long',year:'numeric',month:'long',day:'numeric'}))}
            ${req.remarks ? row('Remarks', req.remarks) : ''}
          </table>
        </td></tr>
        <!-- Next Steps -->
        <tr><td style="padding:0 40px 28px;">
          <div style="background:#f0f4ff;border-left:4px solid #0d1f3c;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0d1f3c;">📋 Next Steps</p>
            <ol style="margin:0;padding-left:18px;font-size:13px;color:#4a5568;line-height:1.8;">
              <li>Pay the filing fee at the <strong>City Treasurer's Office</strong> and get an Official Receipt.</li>
              <li>Wait for a <strong>Ready for Pickup</strong> notification at this email address.</li>
              <li>Bring your <strong>valid government ID</strong>, Official Receipt, and this control number when claiming.</li>
            </ol>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0d1f3c;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);">Office of the Municipal Civil Registrar &nbsp;·&nbsp; Municipal Hall, Ground Floor</p>
          <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">This is an automated message. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

function templateFIL(req: any): { subject: string; html: string } {
  return {
    subject: `Nakumpirma ang Kahilingan sa OMCR — ${req.id}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,60,0.10);">
        <tr><td style="background:#0d1f3c;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e8c96a;font-weight:600;">TANGGAPAN NG MUNICIPAL NA CIVIL REGISTRAR</p>
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">Nakumpirma ang Iyong Kahilingan</h1>
        </td></tr>
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#7a6e5f;">ANG IYONG CONTROL NUMBER</p>
          <div style="display:inline-block;background:#f9f2de;border:2px dashed #c8962a;border-radius:10px;padding:16px 36px;font-family:'Courier New',monospace;font-size:26px;font-weight:700;color:#0d1f3c;letter-spacing:3px;">${req.id}</div>
          <p style="margin:16px 0 0;font-size:13px;color:#7a6e5f;">Itago ang numerong ito. Kakailanganin mo ito para subaybayan at kunin ang iyong dokumento.</p>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8dc;border-radius:8px;overflow:hidden;">
            <tr style="background:#f7f5f0;"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7a6e5f;">Mga Detalye ng Kahilingan</td></tr>
            ${row('Buong Pangalan', req.name)}
            ${row('Hiniling na Dokumento', req.doctype)}
            ${row('Bilang ng Kopya', req.copies)}
            ${row('Layunin', req.purpose)}
            ${row('Petsa ng Paghain', new Date(req.created_at).toLocaleDateString('fil-PH', {weekday:'long',year:'numeric',month:'long',day:'numeric'}))}
            ${req.remarks ? row('Karagdagang Tala', req.remarks) : ''}
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 28px;">
          <div style="background:#f0f4ff;border-left:4px solid #0d1f3c;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0d1f3c;">📋 Mga Susunod na Hakbang</p>
            <ol style="margin:0;padding-left:18px;font-size:13px;color:#4a5568;line-height:1.8;">
              <li>Bayaran ang bayad sa pagsampa sa <strong>Tanggapan ng Ingat-yaman ng Lungsod</strong> at kumuha ng Opisyal na Resibo.</li>
              <li>Hintayin ang abiso na <strong>Handa na para Kunin</strong> sa email address na ito.</li>
              <li>Magdala ng <strong>valid na ID</strong>, Opisyal na Resibo, at control number na ito sa pagkuha.</li>
            </ol>
          </div>
        </td></tr>
        <tr><td style="background:#0d1f3c;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);">Tanggapan ng Municipal na Civil Registrar &nbsp;·&nbsp; Municipal Hall, Ground Floor</p>
          <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">Ito ay awtomatikong mensahe. Huwag tumugon sa email na ito.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

function row(label: string, value: any): string {
  return `<tr style="border-top:1px solid #ede8dc;">
    <td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${value}</td>
  </tr>`;
}

// ── HANDLER ────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { requestId, lang } = await req.json();
    if (!requestId) throw new Error("Missing requestId");

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch the full request record
    const { data: request, error } = await sb
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (error || !request) throw new Error("Request not found: " + requestId);

    // Skip silently if no email provided
    if (!request.email) {
      return new Response(JSON.stringify({ sent: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = lang === "fil"
      ? templateFIL(request)
      : templateEN(request);

    await sendEmail(sb, request.email, subject, html);

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-confirmation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
