// supabase/functions/send-status-update/index.ts
// Triggered by the admin dashboard when a request's status changes.
// Sends an email to the requestor — primarily for "Ready for Pickup",
// but also handles "Cancelled" notices.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── TO SWITCH TO RESEND LATER, see send-confirmation/index.ts for steps ────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(sb: any, to: string, subject: string, html: string) {
  const { error } = await sb.auth.admin.sendRawEmail({ to, subject, html });
  if (error) throw error;
}

function shell(headerLabel: string, headerTitle: string, bodyHtml: string, footerLine: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,60,0.10);">
        <tr><td style="background:#0d1f3c;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e8c96a;font-weight:600;">${headerLabel}</p>
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">${headerTitle}</h1>
        </td></tr>
        ${bodyHtml}
        <tr><td style="background:#0d1f3c;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);">${footerLine}</p>
          <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">This is an automated message. / Ito ay awtomatikong mensahe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function readyTemplateEN(req: any): { subject: string; html: string } {
  const body = `
    <tr><td style="padding:32px 40px 0;text-align:center;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;margin-bottom:16px;">📦</div>
      <p style="margin:0 0 8px;font-size:13px;color:#7a6e5f;">Your document is ready for pickup at the OMCR office.</p>
      <div style="display:inline-block;background:#f9f2de;border:2px dashed #c8962a;border-radius:10px;padding:14px 32px;font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#0d1f3c;letter-spacing:3px;margin-top:8px;">${req.id}</div>
    </td></tr>
    <tr><td style="padding:28px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8dc;border-radius:8px;overflow:hidden;">
        <tr style="background:#f7f5f0;"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7a6e5f;">Document Details</td></tr>
        <tr><td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;width:40%;">Full Name</td><td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${req.name}</td></tr>
        <tr style="border-top:1px solid #ede8dc;"><td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;">Document</td><td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${req.doctype}</td></tr>
        <tr style="border-top:1px solid #ede8dc;"><td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;">Copies</td><td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${req.copies}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px;">
      <div style="background:#fef9e7;border-left:4px solid #c8962a;border-radius:0 8px 8px 0;padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0d1f3c;">📌 When you visit, bring:</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#4a5568;line-height:1.8;">
          <li>A <strong>valid government-issued ID</strong></li>
          <li>This <strong>control number</strong></li>
          <li>Your <strong>Official Receipt</strong>, if not yet presented</li>
        </ul>
        <p style="margin:10px 0 0;font-size:12px;color:#7a6e5f;">Office Hours: Mon–Fri 8:00–17:00, Sat 8:00–12:00</p>
      </div>
    </td></tr>`;
  return {
    subject: `Your Document is Ready for Pickup — ${req.id}`,
    html: shell("OFFICE OF THE MUNICIPAL CIVIL REGISTRAR", "Ready for Pickup! 📦", body, "Office of the Municipal Civil Registrar · Municipal Hall, Ground Floor"),
  };
}

function readyTemplateFIL(req: any): { subject: string; html: string } {
  const body = `
    <tr><td style="padding:32px 40px 0;text-align:center;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;margin-bottom:16px;">📦</div>
      <p style="margin:0 0 8px;font-size:13px;color:#7a6e5f;">Handa na ang iyong dokumento para kunin sa tanggapan ng OMCR.</p>
      <div style="display:inline-block;background:#f9f2de;border:2px dashed #c8962a;border-radius:10px;padding:14px 32px;font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#0d1f3c;letter-spacing:3px;margin-top:8px;">${req.id}</div>
    </td></tr>
    <tr><td style="padding:28px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8dc;border-radius:8px;overflow:hidden;">
        <tr style="background:#f7f5f0;"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7a6e5f;">Detalye ng Dokumento</td></tr>
        <tr><td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;width:40%;">Buong Pangalan</td><td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${req.name}</td></tr>
        <tr style="border-top:1px solid #ede8dc;"><td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;">Dokumento</td><td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${req.doctype}</td></tr>
        <tr style="border-top:1px solid #ede8dc;"><td style="padding:10px 16px;font-size:12px;color:#7a6e5f;font-weight:500;">Bilang ng Kopya</td><td style="padding:10px 16px;font-size:13px;color:#1a1612;font-weight:600;">${req.copies}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px;">
      <div style="background:#fef9e7;border-left:4px solid #c8962a;border-radius:0 8px 8px 0;padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0d1f3c;">📌 Kapag dumalaw ka, magdala ng:</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#4a5568;line-height:1.8;">
          <li>Valid na <strong>ID mula sa gobyerno</strong></li>
          <li>Ang <strong>control number</strong> na ito</li>
          <li>Iyong <strong>Opisyal na Resibo</strong>, kung hindi pa naipakita</li>
        </ul>
        <p style="margin:10px 0 0;font-size:12px;color:#7a6e5f;">Oras ng Tanggapan: Lun–Biy 8:00–17:00, Sab 8:00–12:00</p>
      </div>
    </td></tr>`;
  return {
    subject: `Handa na para Kunin ang Iyong Dokumento — ${req.id}`,
    html: shell("TANGGAPAN NG MUNICIPAL NA CIVIL REGISTRAR", "Handa na Para Kunin! 📦", body, "Tanggapan ng Municipal na Civil Registrar · Municipal Hall, Ground Floor"),
  };
}

function cancelledTemplateEN(req: any): { subject: string; html: string } {
  const body = `
    <tr><td style="padding:32px 40px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#7a6e5f;">Your document request has been cancelled.</p>
      <div style="display:inline-block;background:#fee2e2;border:2px dashed #dc2626;border-radius:10px;padding:14px 32px;font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#7f1d1d;letter-spacing:3px;margin-top:8px;">${req.id}</div>
    </td></tr>
    <tr><td style="padding:28px 40px 28px;">
      <p style="margin:0 0 12px;font-size:13px;color:#4a5568;">If this was a mistake or you still need this document, please submit a new request through the OMCR portal.</p>
      ${req.cancel_reason ? `<div style="background:#f7f5f0;border-radius:8px;padding:14px 18px;font-size:13px;color:#1a1612;"><strong>Reason:</strong> ${req.cancel_reason}</div>` : ''}
    </td></tr>`;
  return {
    subject: `Request Cancelled — ${req.id}`,
    html: shell("OFFICE OF THE MUNICIPAL CIVIL REGISTRAR", "Request Cancelled", body, "Office of the Municipal Civil Registrar · Municipal Hall, Ground Floor"),
  };
}

function cancelledTemplateFIL(req: any): { subject: string; html: string } {
  const body = `
    <tr><td style="padding:32px 40px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#7a6e5f;">Ang iyong kahilingan ay kinansela.</p>
      <div style="display:inline-block;background:#fee2e2;border:2px dashed #dc2626;border-radius:10px;padding:14px 32px;font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#7f1d1d;letter-spacing:3px;margin-top:8px;">${req.id}</div>
    </td></tr>
    <tr><td style="padding:28px 40px 28px;">
      <p style="margin:0 0 12px;font-size:13px;color:#4a5568;">Kung ito ay pagkakamali o kailangan mo pa rin ang dokumentong ito, mangyaring magsumite ng bagong kahilingan sa OMCR portal.</p>
      ${req.cancel_reason ? `<div style="background:#f7f5f0;border-radius:8px;padding:14px 18px;font-size:13px;color:#1a1612;"><strong>Dahilan:</strong> ${req.cancel_reason}</div>` : ''}
    </td></tr>`;
  return {
    subject: `Kinansela ang Kahilingan — ${req.id}`,
    html: shell("TANGGAPAN NG MUNICIPAL NA CIVIL REGISTRAR", "Kinansela ang Kahilingan", body, "Tanggapan ng Municipal na Civil Registrar · Municipal Hall, Ground Floor"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { requestId, newStatus, lang } = await req.json();
    if (!requestId || !newStatus) throw new Error("Missing requestId or newStatus");

    // Only email for these two status transitions — Pending/Processing
    // changes are too noisy to be worth emailing about.
    if (newStatus !== "Ready for Pickup" && newStatus !== "Cancelled") {
      return new Response(JSON.stringify({ sent: false, reason: "status_not_notifiable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: request, error } = await sb
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (error || !request) throw new Error("Request not found: " + requestId);

    if (!request.email) {
      return new Response(JSON.stringify({ sent: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFil = lang === "fil";
    const { subject, html } = newStatus === "Ready for Pickup"
      ? (isFil ? readyTemplateFIL(request) : readyTemplateEN(request))
      : (isFil ? cancelledTemplateFIL(request) : cancelledTemplateEN(request));

    await sendEmail(sb, request.email, subject, html);

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-status-update error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
