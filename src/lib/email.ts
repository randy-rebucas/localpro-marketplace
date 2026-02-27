/**
 * Transactional email service using Nodemailer + SMTP.
 *
 * Required env vars (already in .env.local):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";
import type { NotificationType } from "@/types";

// ─── Transporter ──────────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.SMTP_FROM ?? "LocalPro <no-reply@localpro.app>";

// ─── Base template ────────────────────────────────────────────────────────────

function baseTemplate(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:24px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px">LocalPro</span>
            <span style="color:#93c5fd;font-size:13px;margin-left:8px">Marketplace</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600">${title}</h2>
            ${bodyHtml}
            ${ctaUrl && ctaLabel ? `
            <div style="margin-top:28px">
              <a href="${ctaUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">${ctaLabel}</a>
            </div>` : ""}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#64748b;font-size:12px">You received this because you have an account on LocalPro. <a href="${APP_URL}" style="color:#1e3a5f">Visit your dashboard</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Per-event templates ──────────────────────────────────────────────────────

export interface EmailContext {
  type: NotificationType;
  recipientName: string;
  title: string;
  message: string;
  data?: {
    jobId?: string;
    jobTitle?: string;
    amount?: number;
    quoteId?: string;
  };
}

function buildEmailBody(ctx: EmailContext): { subject: string; html: string } {
  const jobUrl = ctx.data?.jobId
    ? `${APP_URL}/client/jobs/${ctx.data.jobId}`
    : undefined;

  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
      Hi <strong>${ctx.recipientName}</strong>,
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0">
      ${ctx.message}
    </p>
    ${ctx.data?.amount !== undefined ? `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
      <span style="font-size:22px;font-weight:700;color:#0c4a6e">₱${ctx.data.amount.toLocaleString()}</span>
    </div>` : ""}
  `;

  const ctaMap: Partial<Record<NotificationType, { label: string; url: string }>> = {
    job_submitted: { label: "Review pending jobs", url: `${APP_URL}/admin/jobs` },
    job_approved: { label: "View your job", url: jobUrl ?? `${APP_URL}/client/jobs` },
    job_rejected: { label: "Post a new job", url: `${APP_URL}/client/post-job` },
    quote_received: { label: "Review quotes", url: jobUrl ?? `${APP_URL}/client/jobs` },
    quote_accepted: { label: "View job details", url: `${APP_URL}/provider/jobs` },
    quote_rejected: { label: "Browse more jobs", url: `${APP_URL}/provider/marketplace` },
    escrow_funded: { label: "View active jobs", url: `${APP_URL}/provider/jobs` },
    payment_confirmed: { label: "View escrow", url: `${APP_URL}/client/escrow` },
    job_completed: { label: "Release payment", url: `${APP_URL}/client/escrow` },
    escrow_released: { label: "View earnings", url: `${APP_URL}/provider/earnings` },
    dispute_opened: { label: "View dispute", url: jobUrl ?? `${APP_URL}/client/jobs` },
    dispute_resolved: { label: "Go to dashboard", url: `${APP_URL}` },
    review_received: { label: "View your profile", url: `${APP_URL}/provider/dashboard` },
    new_message: { label: "Reply now", url: jobUrl ? `${APP_URL}/client/jobs/${ctx.data!.jobId}` : `${APP_URL}` },
  };

  const cta = ctaMap[ctx.type];

  return {
    subject: ctx.title,
    html: baseTemplate(ctx.title, body, cta?.url, cta?.label),
  };
}

// ─── Verification / Reset templates ──────────────────────────────────────────

/** Send email verification link to a new user. */
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const html = baseTemplate(
    "Verify your email address",
    `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
      Hi <strong>${name}</strong>,
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0">
      Thanks for signing up! Please verify your email address to activate your LocalPro account.
      This link expires in <strong>24 hours</strong>.
    </p>`,
    verifyUrl,
    "Verify Email Address"
  );
  await sendEmail(to, "Verify your LocalPro account", html);
}

/** Send password reset link. */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const html = baseTemplate(
    "Reset your password",
    `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
      Hi <strong>${name}</strong>,
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0">
      We received a request to reset your LocalPro password. Click the button below to choose a new one.
      This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
    </p>`,
    resetUrl,
    "Reset Password"
  );
  await sendEmail(to, "Reset your LocalPro password", html);
}

/** Notify a provider that their account has been approved. */
export async function sendProviderApprovedEmail(to: string, name: string): Promise<void> {
  const html = baseTemplate(
    "Your provider account is approved!",
    `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
      Hi <strong>${name}</strong>,
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0">
      Great news — your LocalPro provider account has been reviewed and approved.
      You can now browse the marketplace and submit quotes on jobs.
    </p>`,
    `${APP_URL}/provider/marketplace`,
    "Browse the Marketplace"
  );
  await sendEmail(to, "Your LocalPro provider account is approved", html);
}

/** Notify a provider that their account has been rejected. */
export async function sendProviderRejectedEmail(to: string, name: string): Promise<void> {
  const html = baseTemplate(
    "Provider application update",
    `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
      Hi <strong>${name}</strong>,
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0">
      After reviewing your provider application, we were unable to approve your account at this time.
      If you believe this was a mistake, please contact our support team.
    </p>`,
    `${APP_URL}/contact`,
    "Contact Support"
  );
  await sendEmail(to, "Your LocalPro provider application status", html);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Send a single transactional email. Non-blocking — errors are swallowed and logged. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return; // silently skip if not configured

  try {
    const transporter = getTransporter();
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[EMAIL]", err);
  }
}

/** Build and send a notification email from a NotificationType context. */
export async function sendNotificationEmail(
  to: string,
  ctx: EmailContext
): Promise<void> {
  const { subject, html } = buildEmailBody(ctx);
  await sendEmail(to, subject, html);
}
