import 'server-only';
import { getServerEnv } from '@/lib/env';

/**
 * Minimal SMTP mailer built on nodemailer.
 *
 * Credentials come exclusively from environment variables — nothing is
 * hard-coded, and when SMTP is disabled every send is a silent no-op so local
 * development and demo deployments work without a mail server.
 */

export interface MailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

let cachedTransport: {
  sendMail: (opts: Record<string, unknown>) => Promise<{ messageId: string }>;
} | null = null;

async function getTransport() {
  if (cachedTransport) return cachedTransport;

  const env = getServerEnv();
  if (!env.SMTP_ENABLED || !env.SMTP_HOST || !env.SMTP_USER) return null;

  const nodemailer = (await import('nodemailer')).default;

  cachedTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return cachedTransport;
}

export async function sendMail(input: MailInput): Promise<{ sent: boolean; messageId?: string; reason?: string }> {
  const env = getServerEnv();
  const transport = await getTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[mail:skipped] SMTP disabled → "${input.subject}" to ${Array.isArray(input.to) ? input.to.join(', ') : input.to}`);
    }
    return { sent: false, reason: 'smtp_disabled' };
  }

  try {
    const info = await transport.sendMail({
      from: { name: env.SMTP_FROM_NAME, address: env.SMTP_FROM_EMAIL },
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
      replyTo: input.replyTo,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[mail] send failed:', (error as Error).message);
    return { sent: false, reason: (error as Error).message };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* -------------------------------------------------------------------------- */
/*  Email templates (branded, table-based so they render in Outlook too)       */
/* -------------------------------------------------------------------------- */

const SHELL = (businessName: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(businessName)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(6,15,36,.08);">
<tr><td style="background:linear-gradient(120deg,#0b1a3a,#1f7ae9);padding:26px 28px;">
  <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:.14em;">S.E.S</div>
  <div style="color:#c7ddfa;font-size:12px;letter-spacing:.22em;margin-top:4px;text-transform:uppercase;">Mobile World</div>
</td></tr>
<tr><td style="padding:28px;">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
  ${escapeHtml(businessName)} · Wholesale Mobile Spare Parts, Accessories &amp; Electronics<br>
  Behind Police Station, Bur Road, Opp. Aishwarya Medical, Bangarpet &ndash; 563114, Karnataka<br>
  Phone / WhatsApp: <a href="tel:+918892399728" style="color:#1f7ae9;">88923 99728</a> · GSTIN: 29HYBR57857HI2J
</td></tr>
</table>
</td></tr></table></body></html>`;

export function renderEnquiryMail(input: {
  businessName: string;
  title: string;
  body: string;
  link?: string;
}): string {
  const rows = input.body
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #eef2f7;color:#475569;font-size:14px;line-height:1.6;">${escapeHtml(line)}</td></tr>`,
    )
    .join('');

  return SHELL(
    input.businessName,
    `<h1 style="margin:0 0 8px;font-size:20px;color:#0b1a3a;">${escapeHtml(input.title)}</h1>
     <p style="margin:0 0 18px;color:#64748b;font-size:14px;">You have a new lead from your website.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
     ${
       input.link
         ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#1f7ae9;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:14px;">Open in admin panel</a></p>`
         : ''
     }`,
  );
}

export function renderRetailerMail(input: {
  businessName: string;
  applicantName: string;
  approved: boolean;
  reason: string | null;
  loginUrl: string;
}): string {
  return SHELL(
    input.businessName,
    input.approved
      ? `<h1 style="margin:0 0 12px;font-size:20px;color:#0b1a3a;">Welcome aboard, ${escapeHtml(input.applicantName)}</h1>
         <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
           Your retailer account has been approved. You can now sign in to view wholesale pricing across the
           full S.E.S Mobile World catalogue and send bulk enquiries directly on WhatsApp.
         </p>
         <p style="margin:0 0 22px;"><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#0b1a3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Sign in to your dashboard</a></p>
         <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
           Questions about minimum order quantity or dealer terms? WhatsApp us on
           <a href="https://wa.me/918892399728" style="color:#1f7ae9;">88923 99728</a>.
         </p>`
      : `<h1 style="margin:0 0 12px;font-size:20px;color:#0b1a3a;">Update on your application</h1>
         <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
           Thank you for your interest in becoming a retail partner. We are not able to approve your
           application at this time.
         </p>
         ${input.reason ? `<p style="margin:0 0 16px;padding:12px 14px;background:#fff7ed;border-left:3px solid #f97316;color:#7c2d12;font-size:14px;">${escapeHtml(input.reason)}</p>` : ''}
         <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
           You can still browse our catalogue and send us WhatsApp enquiries for any product.
         </p>`,
  );
}

export function renderPasswordResetMail(input: {
  businessName: string;
  name: string;
  resetUrl: string;
  ipHint: string;
}): string {
  return SHELL(
    input.businessName,
    `<h1 style="margin:0 0 12px;font-size:20px;color:#0b1a3a;">Password reset</h1>
     <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
       Hello ${escapeHtml(input.name)}, use the button below to choose a new password. This link expires in
       60 minutes and can only be used once.
     </p>
     <p style="margin:0 0 20px;"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#1f7ae9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Reset my password</a></p>
     <p style="margin:0;padding:12px 14px;background:#fef2f2;border-left:3px solid #ef4444;color:#991b1b;font-size:13px;line-height:1.6;">
       If you did not request this, ignore this email and change your password immediately.
       Request originated from IP ${escapeHtml(input.ipHint)}.
     </p>`,
  );
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
