/**
 * Transactional email service using Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY  — from resend.com dashboard
 *   SMTP_FROM       — sender address, e.g. "LocalPro <no-reply@localpro.asia>"
 */

import { Resend } from "resend";
import type { NotificationType } from "@/types";

// ─── Client ───────────────────────────────────────────────────────────────────

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.SMTP_FROM ?? "LocalPro <no-reply@localpro.app>";

// ─── Base layout ──────────────────────────────────────────────────────────────

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
            <h2 style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:600">${title}</h2>
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

// ─── Inline snippet helpers ───────────────────────────────────────────────────

const p = (text: string) =>
  `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">${text}</p>`;

const greeting = (name: string) => p(`Hi <strong>${name}</strong>,`);

function amountBox(amount: number, label?: string) {
  return `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
    ${label ? `<p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">${label}</p>` : ""}
    <span style="font-size:24px;font-weight:700;color:#0c4a6e">₱${amount.toLocaleString()}</span>
  </div>`;
}

function callout(content: string, tone: "info" | "success" | "warning" | "danger" = "info") {
  const palettes = {
    info:    { bg: "#f0f9ff", border: "#bae6fd", color: "#0c4a6e" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#14532d" },
    warning: { bg: "#fefce8", border: "#fde68a", color: "#78350f" },
    danger:  { bg: "#fef2f2", border: "#fecaca", color: "#7f1d1d" },
  };
  const { bg, border, color } = palettes[tone];
  return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 16px;margin:20px 0;color:${color};font-size:14px;line-height:1.55">${content}</div>`;
}

/**
 * Marketing / admin-message email template.
 * Use this for direct messages sent by admins to users — not transactional events.
 */
export function baseMarketingTemplate(subject: string, recipientName: string, bodyText: string): string {
  const paragraphs = bodyText
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 12px">${line}</p>`)
    .join("");

  return baseTemplate(
    subject,
    `${greeting(recipientName)}${paragraphs}`,
  );
}

// ─── Per-event templates ──────────────────────────────────────────────────────

export interface EmailContext {
  type: NotificationType;
  recipientName: string;
  recipientRole?: string;
  title: string;
  message: string;
  data?: {
    jobId?: string;
    jobTitle?: string;
    amount?: number;
    quoteId?: string;
    consultationId?: string;
    estimateAmount?: number;
    payoutId?: string;
    disputeId?: string;
  };
}

interface RenderedEmail {
  subject: string;
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

// eslint-disable-next-line complexity
function renderEmailContent(ctx: EmailContext): RenderedEmail {
  const { recipientName: name, data, recipientRole, message } = ctx;

  const jobUrl = data?.jobId
    ? `${APP_URL}/${recipientRole === "provider" ? "provider" : "client"}/jobs/${data.jobId}`
    : undefined;
  const jTitle = data?.jobTitle ? `<strong>${data.jobTitle}</strong>` : "your job";
  const amt = data?.amount ?? data?.estimateAmount;

  switch (ctx.type) {

    // ── Job lifecycle ─────────────────────────────────────────────────────────

    case "job_submitted":
      return {
        subject: ctx.title,
        title: "New job pending review",
        body: greeting(name)
          + p(`A new job has been posted on LocalPro and is waiting for admin approval.`)
          + (data?.jobTitle ? callout(`<strong>${data.jobTitle}</strong>`, "info") : "")
          + p("Please review and approve or reject it in the admin panel."),
        ctaUrl: `${APP_URL}/admin/jobs`,
        ctaLabel: "Review in admin panel",
      };

    case "job_approved":
      return {
        subject: ctx.title,
        title: "Your job is live!",
        body: greeting(name)
          + p(`Your job ${jTitle} has been <strong>approved</strong> and is now visible to providers on the marketplace.`)
          + callout("Providers can now discover and submit quotes on your job. You'll be notified when the first quote arrives.", "success"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "View your job",
      };

    case "job_rejected":
      return {
        subject: ctx.title,
        title: "Job could not be approved",
        body: greeting(name)
          + p(`Your job ${jTitle} was not approved at this time.`)
          + callout(message || "Please ensure your job posting follows our community guidelines. You're welcome to revise and resubmit.", "warning")
          + p("If you need help, feel free to contact our support team."),
        ctaUrl: `${APP_URL}/client/post-job`,
        ctaLabel: "Post a new job",
      };

    case "job_expired":
      return {
        subject: ctx.title,
        title: "Your job has expired",
        body: greeting(name)
          + p(`Your job ${jTitle} has expired without receiving any quotes.`)
          + callout("Jobs expire after a set period of inactivity. Try reposting with a more detailed description or an adjusted budget to attract more providers.", "warning"),
        ctaUrl: `${APP_URL}/client/post-job`,
        ctaLabel: "Repost this job",
      };

    case "job_direct_invite":
      return {
        subject: ctx.title,
        title: "You've been personally invited!",
        body: greeting(name)
          + p(`A client has directly invited you to submit a quote for ${jTitle}.`)
          + callout("Direct invites mean the client specifically chose you based on your skills and profile. This is a great opportunity!", "success"),
        ctaUrl: jobUrl ?? `${APP_URL}/provider/marketplace`,
        ctaLabel: "View the job",
      };

    case "recurring_job_spawned":
      return {
        subject: ctx.title,
        title: "New recurring job ready",
        body: greeting(name)
          + p(`A new instance of your recurring job ${jTitle} has been created and is ready to begin.`)
          + callout("Your recurring schedule is active. Log in to view the latest job and get started.", "info"),
        ctaUrl: recipientRole === "provider" ? `${APP_URL}/provider/jobs` : `${APP_URL}/client/jobs`,
        ctaLabel: "View jobs",
      };

    // ── Quotes ────────────────────────────────────────────────────────────────

    case "quote_received":
      return {
        subject: ctx.title,
        title: "New quote received",
        body: greeting(name)
          + p(`A provider has submitted a quote for your job ${jTitle}.`)
          + (amt !== undefined ? amountBox(amt, "Quote Amount") : "")
          + p("Review the quote details and accept if you're satisfied with the provider's proposal."),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "Review quote",
      };

    case "quote_accepted":
      return {
        subject: ctx.title,
        title: "Your quote was accepted! 🎉",
        body: greeting(name)
          + p(`Congratulations — your quote for ${jTitle} has been <strong>accepted</strong> by the client.`)
          + (amt !== undefined ? amountBox(amt, "Accepted Amount") : "")
          + callout("The client will now fund the escrow to secure your payment. You'll receive a notification as soon as funds are ready and you can start work.", "success"),
        ctaUrl: `${APP_URL}/provider/jobs`,
        ctaLabel: "View job details",
      };

    case "quote_rejected":
      return {
        subject: ctx.title,
        title: "Quote not selected this time",
        body: greeting(name)
          + p(`Your quote for ${jTitle} was not selected this time.`)
          + callout("Don't be discouraged — the marketplace has many opportunities. Browse open jobs that match your skills.", "info"),
        ctaUrl: `${APP_URL}/provider/marketplace`,
        ctaLabel: "Browse the marketplace",
      };

    case "quote_expired":
      return {
        subject: ctx.title,
        title: "Your quote has expired",
        body: greeting(name)
          + p(`Your quote for ${jTitle} has expired without a response from the client.`)
          + p("The job may still be open — check the marketplace and consider resubmitting an updated quote."),
        ctaUrl: `${APP_URL}/provider/marketplace`,
        ctaLabel: "Browse open jobs",
      };

    // ── Payments & Escrow ─────────────────────────────────────────────────────

    case "escrow_funded":
      return {
        subject: ctx.title,
        title: "Escrow funded — you're ready to work!",
        body: greeting(name)
          + p(`The client has secured payment in escrow for job ${jTitle}.`)
          + (amt !== undefined ? amountBox(amt, "Secured in Escrow") : "")
          + callout("Your payment is protected. Once you complete the work and the client approves it, funds will be released to you.", "success"),
        ctaUrl: `${APP_URL}/provider/jobs`,
        ctaLabel: "View active jobs",
      };

    case "payment_confirmed":
      return {
        subject: ctx.title,
        title: "Payment secured in escrow",
        body: greeting(name)
          + p(`Your payment for job ${jTitle} has been confirmed and is now held securely in escrow.`)
          + (amt !== undefined ? amountBox(amt, "Escrow Amount") : "")
          + callout("The provider has been notified and can start work. Payment will be held securely until you approve the completed work.", "info"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "View job",
      };

    case "payment_failed":
      return {
        subject: ctx.title,
        title: "Payment could not be processed",
        body: greeting(name)
          + p(`We were unable to process your payment for job ${jTitle}.`)
          + callout("This is usually caused by an issue with your payment method. Please try again or use a different card.", "danger"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "Try again",
      };

    case "payment_reminder":
      return {
        subject: ctx.title,
        title: "Payment reminder",
        body: greeting(name)
          + p(message)
          + (amt !== undefined ? amountBox(amt) : ""),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "View job",
      };

    case "job_completed":
      return {
        subject: ctx.title,
        title: "Work completed — please review",
        body: greeting(name)
          + p(`Your provider has marked job ${jTitle} as <strong>complete</strong>.`)
          + (amt !== undefined ? amountBox(amt, "Amount to Release") : "")
          + callout("Please review the work. If you're satisfied, release the escrow payment to the provider. If there's an issue, you can open a dispute.", "info"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "Review and release payment",
      };

    case "escrow_released":
      return {
        subject: ctx.title,
        title: "Payment released to you!",
        body: greeting(name)
          + p(`The client has released escrow for job ${jTitle}. Your earnings are on the way.`)
          + (amt !== undefined ? amountBox(amt, "Amount Released") : "")
          + callout("Funds will be available in your earnings account shortly. Thank you for completing the job!", "success"),
        ctaUrl: `${APP_URL}/provider/earnings`,
        ctaLabel: "View earnings",
      };

    case "escrow_auto_released":
      return {
        subject: ctx.title,
        title: "Escrow automatically released",
        body: greeting(name)
          + p(`Escrow for job ${jTitle} was automatically released after the review period elapsed without a client response.`)
          + (amt !== undefined ? amountBox(amt, "Amount Released") : "")
          + callout("Funds are now available in your earnings account.", "success"),
        ctaUrl: `${APP_URL}/provider/earnings`,
        ctaLabel: "View earnings",
      };

    // ── Payouts ───────────────────────────────────────────────────────────────

    case "payout_requested":
      return {
        subject: ctx.title,
        title: "New payout request received",
        body: greeting(name)
          + (recipientRole === "admin"
            ? p("A provider has submitted a new payout request for review.")
            : p("Your payout request has been submitted and is pending admin review."))
          + (amt !== undefined ? amountBox(amt, "Requested Amount") : "")
          + (recipientRole === "admin"
            ? p("Please review and process this request in the admin panel.")
            : callout("You'll be notified once your payout is approved and processed.", "info")),
        ctaUrl: recipientRole === "admin" ? `${APP_URL}/admin/payouts` : `${APP_URL}/provider/earnings`,
        ctaLabel: recipientRole === "admin" ? "Review payout request" : "View earnings",
      };

    case "payout_status_update":
      return {
        subject: ctx.title,
        title: "Payout status updated",
        body: greeting(name)
          + p(message)
          + (amt !== undefined ? amountBox(amt, "Payout Amount") : ""),
        ctaUrl: `${APP_URL}/provider/earnings`,
        ctaLabel: "View earnings",
      };

    // ── Disputes ──────────────────────────────────────────────────────────────

    case "dispute_opened":
      return {
        subject: ctx.title,
        title: "A dispute has been opened",
        body: greeting(name)
          + p(`A dispute has been filed for job ${jTitle}.`)
          + callout(message, "warning")
          + p("Our support team will review the case. Please be prepared to provide any additional information if requested."),
        ctaUrl: jobUrl ?? `${APP_URL}`,
        ctaLabel: "View dispute details",
      };

    case "dispute_resolved":
      return {
        subject: ctx.title,
        title: "Dispute resolved",
        body: greeting(name)
          + p(`The dispute for job ${jTitle} has been resolved.`)
          + callout(message, "info"),
        ctaUrl: recipientRole === "provider" ? `${APP_URL}/provider/jobs` : `${APP_URL}/client/jobs`,
        ctaLabel: "Go to dashboard",
      };

    // ── Reviews ───────────────────────────────────────────────────────────────

    case "review_received":
      return {
        subject: ctx.title,
        title: "You received a new review!",
        body: greeting(name)
          + p(`A client has left you a review for job ${jTitle}.`)
          + callout(message, "info")
          + p("Reviews help you build trust and attract more clients. Thank you for your great work!"),
        ctaUrl: `${APP_URL}/provider/dashboard`,
        ctaLabel: "View your profile",
      };

    // ── Messages ──────────────────────────────────────────────────────────────

    case "new_message":
      return {
        subject: ctx.title,
        title: "You have a new message",
        body: greeting(name)
          + p(`You received a new message${data?.jobTitle ? ` regarding <strong>${data.jobTitle}</strong>` : ""}.`)
          + callout(message, "info"),
        ctaUrl: jobUrl ?? `${APP_URL}`,
        ctaLabel: "Reply now",
      };

    // ── Consultations ─────────────────────────────────────────────────────────

    case "consultation_request":
      return {
        subject: ctx.title,
        title: "New consultation request",
        body: greeting(name)
          + p(`A client has requested a <strong>consultation</strong> for ${jTitle}.`)
          + callout(message, "info")
          + p("You can discuss the project details and optionally provide a cost estimate directly through the consultation."),
        ctaUrl: `${APP_URL}/provider/consultations`,
        ctaLabel: "View request",
      };

    case "consultation_accepted":
      return {
        subject: ctx.title,
        title: "Consultation accepted!",
        body: greeting(name)
          + p(`A provider has <strong>accepted</strong> your consultation request for ${jTitle}.`)
          + callout("You can now communicate directly with the provider and request a detailed estimate before posting a formal job.", "success"),
        ctaUrl: `${APP_URL}/client/consultations`,
        ctaLabel: "View consultation",
      };

    case "estimate_provided":
      return {
        subject: ctx.title,
        title: "Estimate received from provider",
        body: greeting(name)
          + p(`A provider has sent a cost estimate for ${jTitle}.`)
          + (amt !== undefined ? amountBox(amt, "Estimate Amount") : "")
          + callout("Review the estimate and convert it into a formal job posting if you'd like to proceed.", "info"),
        ctaUrl: `${APP_URL}/client/consultations`,
        ctaLabel: "Review estimate",
      };

    case "consultation_stale":
      return {
        subject: ctx.title,
        title: "Consultation needs attention",
        body: greeting(name)
          + p(`The consultation for ${jTitle} has been inactive for some time.`)
          + callout("Please take action to keep this consultation moving forward, or close it if it's no longer needed.", "warning"),
        ctaUrl: recipientRole === "provider"
          ? `${APP_URL}/provider/consultations`
          : `${APP_URL}/client/consultations`,
        ctaLabel: "View consultation",
      };

    case "consultation_expired":
      return {
        subject: ctx.title,
        title: "Consultation has expired",
        body: greeting(name)
          + p(`The consultation for ${jTitle} has expired without reaching an agreement.`)
          + p("You're welcome to start a new consultation if you're still interested in working together."),
        ctaUrl: recipientRole === "provider" ? `${APP_URL}/provider/marketplace` : `${APP_URL}/client/post-job`,
        ctaLabel: recipientRole === "provider" ? "Browse open jobs" : "Post a new job",
      };

    // ── Reminders ─────────────────────────────────────────────────────────────

    case "reminder_profile_incomplete":
      return {
        subject: ctx.title,
        title: "Complete your provider profile",
        body: greeting(name)
          + p("Your LocalPro profile is incomplete. A complete profile significantly improves your chances of getting hired.")
          + callout("Add your skills, portfolio, bio, and availability to start appearing in search results and receiving job invitations.", "warning"),
        ctaUrl: `${APP_URL}/provider/profile`,
        ctaLabel: "Complete my profile",
      };

    case "reminder_fund_escrow":
      return {
        subject: ctx.title,
        title: "Don't forget to fund escrow",
        body: greeting(name)
          + p(`You have an accepted quote for ${jTitle} that is waiting for escrow funding.`)
          + callout("Fund escrow to formally start the job. Your payment is held securely and only released when you approve the completed work.", "warning"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "Fund escrow now",
      };

    case "reminder_no_quotes":
      return {
        subject: ctx.title,
        title: "Your job hasn't received any quotes yet",
        body: greeting(name)
          + p(`Your job ${jTitle} hasn't received any quotes yet.`)
          + callout("Consider adding more details to your job description or adjusting the budget to attract more providers.", "warning"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "Update your job",
      };

    case "reminder_start_job":
      return {
        subject: ctx.title,
        title: "Time to get started!",
        body: greeting(name)
          + p(`Escrow has been funded for job ${jTitle} — you can now begin work.`)
          + callout("Log in and update the job status once you've started. Keeping the client informed ensures a smooth experience.", "info"),
        ctaUrl: `${APP_URL}/provider/jobs`,
        ctaLabel: "View your jobs",
      };

    case "reminder_complete_job":
      return {
        subject: ctx.title,
        title: "Please mark your job as complete",
        body: greeting(name)
          + p(`It's been a while since work started on ${jTitle}. If you've finished the work, please mark the job as complete so the client can review and release your payment.`),
        ctaUrl: `${APP_URL}/provider/jobs`,
        ctaLabel: "Update job status",
      };

    case "reminder_leave_review":
      return {
        subject: ctx.title,
        title: "How was your experience?",
        body: greeting(name)
          + p(`Your job ${jTitle} is complete! Share your feedback about the provider.`)
          + callout("Reviews help other clients make informed decisions and reward providers who do great work.", "info"),
        ctaUrl: jobUrl ?? `${APP_URL}/client/jobs`,
        ctaLabel: "Leave a review",
      };

    case "reminder_stale_dispute":
      return {
        subject: ctx.title,
        title: "Dispute awaiting your response",
        body: greeting(name)
          + p(`The dispute for job ${jTitle} is awaiting further information from you.`)
          + callout(message, "warning"),
        ctaUrl: jobUrl ?? `${APP_URL}`,
        ctaLabel: "Respond to dispute",
      };

    case "reminder_pending_validation":
      return {
        subject: ctx.title,
        title: "Action required: pending validation",
        body: greeting(name)
          + p(message),
        ctaUrl: `${APP_URL}/admin`,
        ctaLabel: "Go to admin panel",
      };

    // ── Admin message ─────────────────────────────────────────────────────────

    case "admin_message":
      return {
        subject: ctx.title,
        title: ctx.title,
        body: greeting(name)
          + ctx.message
            .split("\n")
            .filter(Boolean)
            .map((line) => p(line))
            .join(""),
      };

    // ── Fallback ──────────────────────────────────────────────────────────────

    default:
      return {
        subject: ctx.title,
        title: ctx.title,
        body: greeting(name) + p(message),
      };
  }
}

function buildEmailBody(ctx: EmailContext): { subject: string; html: string } {
  const rendered = renderEmailContent(ctx);
  return {
    subject: rendered.subject,
    html: baseTemplate(rendered.title, rendered.body, rendered.ctaUrl, rendered.ctaLabel),
  };
}

// ─── Standalone templates ─────────────────────────────────────────────────────

/** Send email verification link to a new user. */
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const html = baseTemplate(
    "Verify your email address",
    greeting(name)
      + p("Thanks for signing up! Please verify your email address to activate your LocalPro account.")
      + callout("This verification link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.", "info"),
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
    greeting(name)
      + p("We received a request to reset your LocalPro password. Click the button below to choose a new one.")
      + callout("This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your account is not at risk.", "warning"),
    resetUrl,
    "Reset Password"
  );
  await sendEmail(to, "Reset your LocalPro password", html);
}

/** Notify a provider that their account has been approved. */
export async function sendProviderApprovedEmail(to: string, name: string): Promise<void> {
  const html = baseTemplate(
    "Your provider account is approved!",
    greeting(name)
      + p("Great news — your LocalPro provider account has been reviewed and <strong>approved</strong>.")
      + callout("You can now browse the marketplace, receive job invitations, and submit quotes. Complete your profile to maximise visibility.", "success")
      + p("Welcome to the LocalPro provider community!"),
    `${APP_URL}/provider/marketplace`,
    "Browse the Marketplace"
  );
  await sendEmail(to, "Your LocalPro provider account is approved", html);
}

/** Notify a provider that their account has been rejected. */
export async function sendProviderRejectedEmail(to: string, name: string): Promise<void> {
  const html = baseTemplate(
    "Provider application update",
    greeting(name)
      + p("After reviewing your provider application, we were unable to approve your account at this time.")
      + callout("If you believe this was a mistake or would like more information, please reach out to our support team. We're happy to help.", "warning"),
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
  if (!process.env.RESEND_API_KEY) return; // silently skip if not configured

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(error.message);
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
